import type {DitherMode, PrintBlock, PrinterSettings, TextAlign} from '../types/printer';

export const THERMAL_WIDTH_PX = 384; // 58mm thermal paper printable width (48mm @ 203dpi)

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export interface ImageProcessOptions {
  ditherMode: DitherMode;
  threshold: number; // 0..255
  brightness: number; // -100..100
  contrast: number; // -100..100
  invert: boolean;
}

export interface ThermalEffectOptions {
  gamma?: number; // 0.5..2.0 (>1 brightens midtones for thermal paper)
  sharpen?: number; // 0..100 unsharp mask intensity
  sketchEdge?: boolean; // edge-outline mode for crisp thermal line drawings
}

export interface ImageEffectPresetConfig {
  id: 'atkinson-detail' | 'photo-balanced' | 'crisp-line' | 'halftone-newsprint' | 'sketch-outline' | 'negative-stamp';
  label: string;
  hint: string;
  ditherMode: DitherMode;
  threshold: number;
  brightness: number;
  contrast: number;
  sharpen: number;
  gamma: number;
  sketchEdge: boolean;
  invert: boolean;
}

export const IMAGE_EFFECT_PRESETS: ImageEffectPresetConfig[] = [
  {
    id: 'atkinson-detail',
    label: 'Atkinson Detail',
    hint: 'Best overall for 58mm thermal photos',
    ditherMode: 'atkinson',
    threshold: 132,
    brightness: 6,
    contrast: 22,
    sharpen: 45,
    gamma: 1.25,
    sketchEdge: false,
    invert: false,
  },
  {
    id: 'photo-balanced',
    label: 'Photo Smooth',
    hint: 'Natural gradients with Floyd-Steinberg',
    ditherMode: 'floyd-steinberg',
    threshold: 128,
    brightness: 4,
    contrast: 15,
    sharpen: 25,
    gamma: 1.3,
    sketchEdge: false,
    invert: false,
  },
  {
    id: 'crisp-line',
    label: 'Crisp Logo',
    hint: 'Sharp 1-bit threshold for icons & QR',
    ditherMode: 'threshold',
    threshold: 140,
    brightness: 0,
    contrast: 45,
    sharpen: 70,
    gamma: 1.0,
    sketchEdge: false,
    invert: false,
  },
  {
    id: 'halftone-newsprint',
    label: 'Halftone Grid',
    hint: 'Ordered 4x4 Bayer newspaper dots',
    ditherMode: 'bayer',
    threshold: 134,
    brightness: 5,
    contrast: 25,
    sharpen: 35,
    gamma: 1.15,
    sketchEdge: false,
    invert: false,
  },
  {
    id: 'sketch-outline',
    label: 'Ink-Saver Sketch',
    hint: 'Extracts crisp edges to prevent ink bleed',
    ditherMode: 'threshold',
    threshold: 185,
    brightness: 10,
    contrast: 35,
    sharpen: 30,
    gamma: 1.0,
    sketchEdge: true,
    invert: false,
  },
  {
    id: 'negative-stamp',
    label: 'Negative Stamp',
    hint: 'Inverted white-on-black thermal block',
    ditherMode: 'atkinson',
    threshold: 132,
    brightness: 0,
    contrast: 30,
    sharpen: 40,
    gamma: 1.1,
    sketchEdge: false,
    invert: true,
  },
];

/**
 * Converts RGBA pixels into an adjusted 8-bit grayscale buffer (0 = black, 255 = white).
 * Transparent pixels are composited onto white thermal paper (255).
 */
export function rgbaToGrayscale(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  brightness = 0,
  contrast = 0,
  invert = false,
): Uint8Array {
  const len = width * height;
  const gray = new Uint8Array(len);
  const bOffset = (brightness / 100) * 128;
  const cClamped = Math.max(-100, Math.min(100, contrast));
  const cFactor = (259 * (cClamped + 255)) / (255 * (259 - cClamped));

  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const a = rgba[idx + 3] / 255;

    // Composite over white thermal paper
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let v = lum * a + 255 * (1 - a);

    // Apply brightness & contrast
    v = cFactor * (v - 128) + 128 + bOffset;
    if (invert) {
      v = 255 - v;
    }

    gray[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  return gray;
}

/**
 * Applies thermal-head optimizations to an 8-bit grayscale buffer:
 * 1. Gamma lift (prevents thermal dot-gain from crushing dark midtones)
 * 2. 3x3 Edge Sharpening (counteracts thermal paper bleed)
 * 3. Optional Sketch/Outline filter (Sobel-like gradient inversion onto white paper)
 */
export function applyThermalImageEffects(
  gray: Uint8Array,
  width: number,
  height: number,
  effects: ThermalEffectOptions,
): Uint8Array {
  const gamma = Math.max(0.5, Math.min(2.0, effects.gamma ?? 1.0));
  const sharpen = Math.max(0, Math.min(100, effects.sharpen ?? 0));
  const sketchEdge = Boolean(effects.sketchEdge);

  // Step 1: Gamma LUT
  let current = new Uint8Array(gray.length);
  if (Math.abs(gamma - 1.0) > 0.01) {
    const lut = new Uint8Array(256);
    const invGamma = 1 / gamma;
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.min(255, Math.max(0, Math.round(Math.pow(i / 255, invGamma) * 255)));
    }
    for (let i = 0; i < gray.length; i++) {
      current[i] = lut[gray[i]];
    }
  } else {
    current.set(gray);
  }

  // Step 2: Optional 3x3 Laplacian sharpen (when width & height >= 3)
  if (sharpen > 0 && width >= 3 && height >= 3) {
    const amount = (sharpen / 100) * 1.25;
    const out = new Uint8Array(current.length);
    out.set(current);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const center = current[idx];
        const neighbors =
          current[idx - 1] +
          current[idx + 1] +
          current[idx - width] +
          current[idx + width];
        const laplacian = 4 * center - neighbors;
        const val = Math.round(center + amount * laplacian);
        out[idx] = val < 0 ? 0 : val > 255 ? 255 : val;
      }
    }
    current = out;
  }

  // Step 3: Optional Sketch / Edge Outline filter
  if (sketchEdge && width >= 3 && height >= 3) {
    const edges = new Uint8Array(current.length);
    edges.fill(255);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const gx =
          -current[idx - width - 1] +
          current[idx - width + 1] -
          2 * current[idx - 1] +
          2 * current[idx + 1] -
          current[idx + width - 1] +
          current[idx + width + 1];
        const gy =
          -current[idx - width - 1] -
          2 * current[idx - width] -
          current[idx - width + 1] +
          current[idx + width - 1] +
          2 * current[idx + width] +
          current[idx + width + 1];
        const mag = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy) * 0.45));
        edges[idx] = 255 - mag;
      }
    }
    current = edges;
  }

  return current;
}

/**
 * Dithers an 8-bit grayscale buffer into a 1-bit thermal dot array:
 * 1 = burn black dot, 0 = leave white paper.
 */
export function ditherGrayscaleBuffer(
  gray: Uint8Array,
  width: number,
  height: number,
  options: Pick<ImageProcessOptions, 'ditherMode' | 'threshold'>,
): Uint8Array {
  const mono = new Uint8Array(width * height);
  const cutoff = Math.max(0, Math.min(255, options.threshold));

  if (options.ditherMode === 'threshold') {
    for (let i = 0; i < gray.length; i++) {
      mono[i] = gray[i] < cutoff ? 1 : 0;
    }
    return mono;
  }

  if (options.ditherMode === 'bayer') {
    const bias = cutoff - 128;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const bayerVal = ((BAYER_4X4[y & 3][x & 3] + 0.5) / 16) * 255;
        const adjusted = gray[idx] - bias;
        mono[idx] = adjusted < bayerVal ? 1 : 0;
      }
    }
    return mono;
  }

  // Error diffusion (Floyd-Steinberg or Atkinson) using floating buffer
  const buf = new Float32Array(gray.length);
  const bias = cutoff - 128;
  for (let i = 0; i < gray.length; i++) {
    buf[i] = Math.max(0, Math.min(255, gray[i] - bias));
  }

  const isAtkinson = options.ditherMode === 'atkinson';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = buf[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      mono[idx] = newPixel === 0 ? 1 : 0;
      const err = oldPixel - newPixel;

      if (isAtkinson) {
        const q = err / 8;
        if (x + 1 < width) buf[idx + 1] += q;
        if (x + 2 < width) buf[idx + 2] += q;
        if (y + 1 < height) {
          if (x - 1 >= 0) buf[idx + width - 1] += q;
          buf[idx + width] += q;
          if (x + 1 < width) buf[idx + width + 1] += q;
        }
        if (y + 2 < height) {
          buf[idx + width * 2] += q;
        }
      } else {
        // Floyd-Steinberg
        if (x + 1 < width) buf[idx + 1] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x - 1 >= 0) buf[idx + width - 1] += (err * 3) / 16;
          buf[idx + width] += (err * 5) / 16;
          if (x + 1 < width) buf[idx + width + 1] += (err * 1) / 16;
        }
      }
    }
  }

  return mono;
}

/**
 * Packs a 1-bit monochrome buffer (1 = black, 0 = white) into ESC/POS GS v 0 raster bit-image bytes.
 * Splits tall images into strips of max 256 rows so low-RAM 58mm BLE printers never drop packets.
 */
export function packMonoToEscPosRaster(
  mono: Uint8Array,
  width: number,
  height: number,
  options: {feedLinesAfter?: number; autoCut?: boolean} = {},
): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const stripMaxRows = 256;
  const chunks: Uint8Array[] = [];

  // ESC @ (Initialize printer)
  chunks.push(new Uint8Array([0x1b, 0x40]));
  // ESC a 1 (Center alignment)
  chunks.push(new Uint8Array([0x1b, 0x61, 0x01]));

  for (let startY = 0; startY < height; startY += stripMaxRows) {
    const stripHeight = Math.min(stripMaxRows, height - startY);
    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = stripHeight & 0xff;
    const yH = (stripHeight >> 8) & 0xff;

    const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    const bitmap = new Uint8Array(bytesPerRow * stripHeight);

    for (let row = 0; row < stripHeight; row++) {
      const y = startY + row;
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x < width && mono[y * width + x] === 1) {
            byteVal |= 1 << (7 - bit);
          }
        }
        bitmap[row * bytesPerRow + bx] = byteVal;
      }
    }

    chunks.push(header, bitmap);
  }

  const feed = Math.max(0, Math.min(12, options.feedLinesAfter ?? 3));
  if (feed > 0) {
    chunks.push(new Uint8Array([0x1b, 0x64, feed])); // ESC d n
  }
  if (options.autoCut) {
    chunks.push(new Uint8Array([0x1d, 0x56, 0x42, 0x00])); // GS V 66 0 (partial cut with feed)
  }

  return concatUint8Arrays(chunks);
}

function alignToEscByte(align: TextAlign): number {
  if (align === 'center') return 0x01;
  if (align === 'right') return 0x02;
  return 0x00;
}

function encodeAsciiLine(text: string): Uint8Array {
  const clean = text
    .replace(/\u2014|\u2013/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '*');
  const out = new Uint8Array(clean.length + 1);
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    out[i] = code >= 32 && code <= 126 ? code : 0x3f;
  }
  out[clean.length] = 0x0a; // LF
  return out;
}

/**
 * Encodes structured blocks into native ESC/POS text & command bytes for fast hardware text printing.
 * Note: Image blocks in text-only mode emit a placeholder caption unless rendered in Raster mode.
 */
export function encodeDocumentToEscPosText(
  blocks: PrintBlock[],
  settings: Pick<PrinterSettings, 'feedLinesAfter' | 'autoCut'>,
): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x1b, 0x40])]; // ESC @

  for (const block of blocks) {
    if (block.type === 'divider') {
      const char =
        block.style === 'double'
          ? '='
          : block.style === 'dotted'
            ? '.'
            : block.style === 'solid'
              ? '_'
              : '-';
      parts.push(new Uint8Array([0x1b, 0x61, 0x00])); // left
      parts.push(new Uint8Array([0x1b, 0x45, 0x00])); // bold off
      parts.push(new Uint8Array([0x1d, 0x21, 0x00])); // normal size
      parts.push(encodeAsciiLine(char.repeat(32)));
      continue;
    }

    if (block.type === 'image') {
      parts.push(new Uint8Array([0x1b, 0x61, alignToEscByte(block.align)]));
      parts.push(
        encodeAsciiLine(`[IMAGE: ${block.caption || block.fileName || 'graphic'}]`),
      );
      continue;
    }

    // Text or Checklist formatting
    parts.push(new Uint8Array([0x1b, 0x61, alignToEscByte(block.align)]));
    parts.push(new Uint8Array([0x1b, 0x45, block.bold ? 0x01 : 0x00])); // ESC E n

    // Font size mapping to GS ! (width/height multiplier)
    const scale = block.fontSize >= 32 ? 0x11 : block.fontSize >= 22 ? 0x01 : 0x00;
    parts.push(new Uint8Array([0x1d, 0x21, scale]));

    // Line spacing mapping to ESC 3 n (dots; default ~30)
    const dots = Math.max(20, Math.min(80, Math.round(block.lineHeight * 24)));
    parts.push(new Uint8Array([0x1b, 0x33, dots]));

    // Font A (0) vs Font B (1) for smaller text
    const fontId = block.fontSize <= 13 || block.fontFamily === 'ibm-plex' ? 0x01 : 0x00;
    parts.push(new Uint8Array([0x1b, 0x4d, fontId]));

    if (block.type === 'text') {
      const lines = block.content.split('\n');
      for (const line of lines) {
        parts.push(encodeAsciiLine(line));
      }
    } else if (block.type === 'checklist') {
      if (block.title.trim()) {
        parts.push(new Uint8Array([0x1b, 0x45, 0x01]));
        parts.push(encodeAsciiLine(block.title));
        parts.push(new Uint8Array([0x1b, 0x45, block.bold ? 0x01 : 0x00]));
      }
      for (const item of block.items) {
        const prefix = item.checked ? '[x] ' : '[ ] ';
        parts.push(encodeAsciiLine(`${prefix}${item.text}`));
      }
    }
  }

  // Reset formatting + feed + cut
  parts.push(new Uint8Array([0x1b, 0x45, 0x00, 0x1d, 0x21, 0x00, 0x1b, 0x32]));
  const feed = Math.max(0, Math.min(12, settings.feedLinesAfter));
  if (feed > 0) {
    parts.push(new Uint8Array([0x1b, 0x64, feed]));
  }
  if (settings.autoCut) {
    parts.push(new Uint8Array([0x1d, 0x56, 0x42, 0x00]));
  }

  return concatUint8Arrays(parts);
}

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const a of arrays) total += a.length;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

export function formatEscPosHexPreview(bytes: Uint8Array, limit = 160): string {
  const slice = bytes.slice(0, limit);
  const hex = Array.from(slice)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  return bytes.length > limit
    ? `${hex} ... (+${bytes.length - limit} bytes)`
    : hex;
}
