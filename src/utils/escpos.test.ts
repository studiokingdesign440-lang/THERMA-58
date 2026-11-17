import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ditherGrayscaleBuffer,
  encodeDocumentToEscPosText,
  formatEscPosHexPreview,
  packMonoToEscPosRaster,
  rgbaToGrayscale,
} from './escpos';
import type {PrintBlock} from '../types/printer';

test('rgbaToGrayscale composites transparent pixels onto white and inverts cleanly', () => {
  // 2x1 pixels: pure black opaque, pure black transparent
  const rgba = new Uint8ClampedArray([
    0, 0, 0, 255,
    0, 0, 0, 0,
  ]);
  const gray = rgbaToGrayscale(rgba, 2, 1, 0, 0, false);
  assert.equal(gray[0], 0);
  assert.equal(gray[1], 255);

  const inverted = rgbaToGrayscale(rgba, 2, 1, 0, 0, true);
  assert.equal(inverted[0], 255);
  assert.equal(inverted[1], 0);
});

test('ditherGrayscaleBuffer produces binary 0/1 output across all dithering modes', () => {
  const gray = new Uint8Array([0, 64, 128, 192, 255, 10, 240, 120, 80]);
  for (const ditherMode of ['threshold', 'floyd-steinberg', 'atkinson', 'bayer'] as const) {
    const mono = ditherGrayscaleBuffer(gray, 3, 3, {ditherMode, threshold: 128});
    assert.equal(mono.length, 9);
    for (const val of mono) {
      assert.ok(val === 0 || val === 1, `unexpected bit value ${val} in ${ditherMode}`);
    }
    assert.equal(mono[0], 1, `black pixel should burn in ${ditherMode}`);
  }
});

test('packMonoToEscPosRaster emits ESC @ init, GS v 0 header, packed bitmap, and cut', () => {
  // 16px wide x 2px tall: row 0 all black, row 1 alternating 10101010
  const mono = new Uint8Array(16 * 2);
  for (let x = 0; x < 16; x++) {
    mono[x] = 1;
    mono[16 + x] = x % 2 === 0 ? 1 : 0;
  }

  const bytes = packMonoToEscPosRaster(mono, 16, 2, {feedLinesAfter: 2, autoCut: true});
  // First 2 bytes: ESC @ (0x1B 0x40)
  assert.equal(bytes[0], 0x1b);
  assert.equal(bytes[1], 0x40);
  // Next 3 bytes: ESC a 1 (0x1B 0x61 0x01)
  assert.equal(bytes[2], 0x1b);
  assert.equal(bytes[3], 0x61);
  assert.equal(bytes[4], 0x01);
  // GS v 0 0 xL=2 xH=0 yL=2 yH=0
  assert.deepEqual(Array.from(bytes.slice(5, 13)), [0x1d, 0x76, 0x30, 0x00, 2, 0, 2, 0]);
  // Packed bitmap row 0: 0xFF 0xFF, row 1: 0xAA 0xAA
  assert.deepEqual(Array.from(bytes.slice(13, 17)), [0xff, 0xff, 0xaa, 0xaa]);
  // Trailing ESC d 2 + GS V 66 0
  assert.deepEqual(Array.from(bytes.slice(17)), [0x1b, 0x64, 2, 0x1d, 0x56, 0x42, 0x00]);
});

test('encodeDocumentToEscPosText encodes checklist items and formatting bytes', () => {
  const blocks: PrintBlock[] = [
    {
      id: 'b1',
      type: 'text',
      content: 'DISPATCH',
      fontFamily: 'jetbrains',
      fontSize: 28,
      lineHeight: 1.2,
      bold: true,
      italic: false,
      align: 'center',
    },
    {
      id: 'b2',
      type: 'checklist',
      title: 'Tasks',
      fontFamily: 'jetbrains',
      fontSize: 16,
      lineHeight: 1.4,
      bold: false,
      italic: false,
      align: 'left',
      items: [
        {id: 'i1', text: 'Pack unit', checked: true},
        {id: 'i2', text: 'Label box', checked: false},
      ],
    },
  ];

  const encoded = encodeDocumentToEscPosText(blocks, {feedLinesAfter: 3, autoCut: false});
  const text = new TextDecoder().decode(encoded);
  assert.ok(text.includes('DISPATCH'));
  assert.ok(text.includes('[x] Pack unit'));
  assert.ok(text.includes('[ ] Label box'));
  assert.equal(encoded[0], 0x1b);
  assert.equal(encoded[1], 0x40);
});

test('formatEscPosHexPreview truncates cleanly beyond limit', () => {
  const bytes = new Uint8Array([0x1b, 0x40, 0x41, 0x42]);
  assert.equal(formatEscPosHexPreview(bytes, 10), '1B 40 41 42');
  assert.equal(formatEscPosHexPreview(bytes, 2), '1B 40 ... (+2 bytes)');
});

import {IMAGE_EFFECT_PRESETS, applyThermalImageEffects} from './escpos';

test('applyThermalImageEffects applies gamma lift, sharpen, and sketchEdge cleanly', () => {
  const gray = new Uint8Array([
    100, 100, 100, 100,
    100, 200, 100, 100,
    100, 100, 100, 100,
    100, 100, 100, 100,
  ]);

  // Gamma > 1 brightens midtones
  const lifted = applyThermalImageEffects(gray, 4, 4, {gamma: 1.5, sharpen: 0, sketchEdge: false});
  assert.ok(lifted[0] > gray[0], 'gamma 1.5 should lift midtone brightness');

  // Sharpening increases local contrast around peak pixel (index 5)
  const sharpened = applyThermalImageEffects(gray, 4, 4, {gamma: 1.0, sharpen: 80, sketchEdge: false});
  assert.ok(sharpened[5] > gray[5], 'sharpening should boost edge peak pixel');

  // Sketch edge turns uniform border white (255) and high-gradient center darker
  const sketched = applyThermalImageEffects(gray, 4, 4, {gamma: 1.0, sharpen: 0, sketchEdge: true});
  assert.equal(sketched[0], 255);
  assert.ok(sketched[6] < 255, 'edge neighbor should be darkened in sketch mode');
});

test('IMAGE_EFFECT_PRESETS defines valid tuned presets for 58mm thermal printing', () => {
  assert.ok(IMAGE_EFFECT_PRESETS.length >= 5);
  for (const preset of IMAGE_EFFECT_PRESETS) {
    assert.ok(preset.id.length > 0);
    assert.ok(preset.gamma >= 0.5 && preset.gamma <= 2.0);
  }
});
