import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanvasFontString,
  estimatePaperLengthMm,
  wrapTextLines,
} from './documentRenderer';

test('wrapTextLines wraps long sentences and preserves explicit newlines', () => {
  // Simple fixed-width char measurement: 10px per char
  const measure = (s: string) => s.length * 10;
  const lines = wrapTextLines('Alpha Beta Gamma\nNext line here', 100, measure);
  assert.deepEqual(lines, ['Alpha Beta', 'Gamma', 'Next line', 'here']);
});

test('wrapTextLines breaks single long unspaced tokens cleanly', () => {
  const measure = (s: string) => s.length * 10;
  const lines = wrapTextLines('ABCDEFGHIJKL', 50, measure);
  assert.deepEqual(lines, ['ABCDE', 'FGHIJ', 'KL']);
});

test('estimatePaperLengthMm converts 203 DPI dots into millimeters', () => {
  assert.equal(estimatePaperLengthMm(400), 50);
  assert.equal(estimatePaperLengthMm(20), 10); // minimum clamp 10mm
});

test('buildCanvasFontString formats italic, weight, size, and font family', () => {
  const font = buildCanvasFontString({
    fontFamily: 'ibm-plex',
    fontSize: 20,
    bold: true,
    italic: true,
  });
  assert.ok(font.startsWith('italic 700 20px'));
  assert.ok(font.includes('IBM Plex Mono'));
});
