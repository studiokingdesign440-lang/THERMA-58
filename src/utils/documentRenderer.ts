import type {
  FontFamilyId,
  ImageBlock,
  PrintBlock,
  TextFormatting,
} from '../types/printer';
import {
  THERMAL_WIDTH_PX,
  applyThermalImageEffects,
  ditherGrayscaleBuffer,
  rgbaToGrayscale,
} from './escpos';

export const FONT_FAMILY_MAP: Record<FontFamilyId, {label: string; css: string}> = {
  jetbrains: {
    label: 'JetBrains Mono',
    css: '"JetBrains Mono", ui-monospace, monospace',
  },
  'ibm-plex': {
    label: 'IBM Plex Mono',
    css: '"IBM Plex Mono", ui-monospace, monospace',
  },
  courier: {
    label: 'Courier Type',
    css: '"Courier New", Courier, monospace',
  },
  sans: {
    label: 'Jakarta Sans',
    css: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  serif: {
    label: 'Editorial Serif',
    css: 'Georgia, "Times New Roman", serif',
  },
};

export function buildCanvasFontString(fmt: Pick<TextFormatting, 'italic' | 'bold' | 'fontSize' | 'fontFamily'>): string {
  const style = fmt.italic ? 'italic' : 'normal';
  const weight = fmt.bold ? '700' : '400';
  const family = FONT_FAMILY_MAP[fmt.fontFamily]?.css ?? FONT_FAMILY_MAP.jetbrains.css;
  return `${style} ${weight} ${fmt.fontSize}px ${family}`;
}

/**
 * Pure word-wrapping utility for fixed-width 58mm thermal printing.
 * Preserves explicit line breaks and wraps long words cleanly at character boundaries.
 */
export function wrapTextLines(
  text: string,
  maxWidthPx: number,
  measureWidth: (s: string) => number,
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }

    const words = para.split(/(\s+)/);
    let currentLine = '';

    for (const token of words) {
      if (token === '') continue;
      const candidate = currentLine + token;
      if (measureWidth(candidate) <= maxWidthPx) {
        currentLine = candidate;
        continue;
      }

      // If currentLine already has content, push it and start a new line
      if (currentLine.trim().length > 0) {
        lines.push(currentLine.trimEnd());
        currentLine = token.trimStart();
      } else {
        currentLine = token;
      }

      // If single token itself exceeds maxWidthPx, break by characters
      while (currentLine.length > 1 && measureWidth(currentLine) > maxWidthPx) {
        let splitIdx = currentLine.length - 1;
        while (splitIdx > 1 && measureWidth(currentLine.slice(0, splitIdx)) > maxWidthPx) {
          splitIdx--;
        }
        lines.push(currentLine.slice(0, splitIdx));
        currentLine = currentLine.slice(splitIdx);
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.trimEnd());
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Converts 384px thermal receipt height to millimeters at 203 DPI (~8 dots/mm).
 */
export function estimatePaperLengthMm(heightPx: number): number {
  return Math.max(10, Math.round((heightPx / 8) * 10) / 10);
}

export interface RenderedReceiptResult {
  width: number;
  height: number;
  paperLengthMm: number;
  monoBuffer: Uint8Array;
}

const PADDING_X = 14;
const CONTENT_WIDTH = THERMAL_WIDTH_PX - PADDING_X * 2;
const PADDING_Y = 16;

interface LayoutStep {
  height: number;
  draw: (ctx: CanvasRenderingContext2D, y: number) => void;
}

/**
 * Renders the complete receipt document into a crisp 384px thermal canvas and
 * returns the 1-bit monochrome thermal buffer ready for GS v 0 raster printing.
 */
export function renderDocumentToCanvas(
  blocks: PrintBlock[],
  canvas: HTMLCanvasElement,
  loadedImages: Map<string, HTMLImageElement>,
  options: {ditherText?: boolean} = {},
): RenderedReceiptResult {
  const measureCtx = canvas.getContext('2d', {willReadFrequently: true});
  if (!measureCtx) {
    throw new Error('Could not acquire 2D rendering context.');
  }

  const steps: LayoutStep[] = [];
  let totalHeight = PADDING_Y;

  for (const block of blocks) {
    if (block.type === 'divider') {
      const h = block.spacingY * 2 + 8;
      steps.push({
        height: h,
        draw: (ctx, y) => {
          const midY = Math.round(y + h / 2);
          ctx.save();
          ctx.strokeStyle = '#000000';
          ctx.fillStyle = '#000000';
          if (block.style === 'solid') {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(PADDING_X, midY);
            ctx.lineTo(THERMAL_WIDTH_PX - PADDING_X, midY);
            ctx.stroke();
          } else if (block.style === 'double') {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(PADDING_X, midY - 2);
            ctx.lineTo(THERMAL_WIDTH_PX - PADDING_X, midY - 2);
            ctx.moveTo(PADDING_X, midY + 2);
            ctx.lineTo(THERMAL_WIDTH_PX - PADDING_X, midY + 2);
            ctx.stroke();
          } else if (block.style === 'dotted') {
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(PADDING_X, midY);
            ctx.lineTo(THERMAL_WIDTH_PX - PADDING_X, midY);
            ctx.stroke();
          } else {
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(PADDING_X, midY);
            ctx.lineTo(THERMAL_WIDTH_PX - PADDING_X, midY);
            ctx.stroke();
          }
          ctx.restore();
        },
      });
      totalHeight += h;
      continue;
    }

    if (block.type === 'text') {
      const font = buildCanvasFontString(block);
      measureCtx.font = font;
      const lines = wrapTextLines(block.content, CONTENT_WIDTH, (s) => measureCtx.measureText(s).width);
      const lineStep = Math.round(block.fontSize * block.lineHeight);
      const blockHeight = lines.length * lineStep + 10;

      steps.push({
        height: blockHeight,
        draw: (ctx, y) => {
          ctx.save();
          ctx.font = font;
          ctx.fillStyle = '#000000';
          ctx.textBaseline = 'top';
          ctx.textAlign = block.align;
          const x =
            block.align === 'center'
              ? THERMAL_WIDTH_PX / 2
              : block.align === 'right'
                ? THERMAL_WIDTH_PX - PADDING_X
                : PADDING_X;

          lines.forEach((line, idx) => {
            ctx.fillText(line, x, y + 4 + idx * lineStep);
          });
          ctx.restore();
        },
      });
      totalHeight += blockHeight;
      continue;
    }

    if (block.type === 'checklist') {
      const font = buildCanvasFontString(block);
      const titleFont = buildCanvasFontString({...block, bold: true});
      const lineStep = Math.round(block.fontSize * block.lineHeight);
      const boxSize = Math.max(12, Math.min(20, Math.round(block.fontSize * 0.78)));
      const textIndent = boxSize + 10;

      measureCtx.font = titleFont;
      const titleLines = block.title.trim()
        ? wrapTextLines(block.title, CONTENT_WIDTH, (s) => measureCtx.measureText(s).width)
        : [];

      measureCtx.font = font;
      const wrappedItems = block.items.map((item) => ({
        item,
        lines: wrapTextLines(
          item.text || ' ',
          CONTENT_WIDTH - textIndent,
          (s) => measureCtx.measureText(s).width,
        ),
      }));

      const titleHeight = titleLines.length > 0 ? titleLines.length * lineStep + 6 : 0;
      const itemsHeight = wrappedItems.reduce(
        (acc, entry) => acc + Math.max(1, entry.lines.length) * lineStep + 6,
        0,
      );
      const blockHeight = titleHeight + itemsHeight + 8;

      steps.push({
        height: blockHeight,
        draw: (ctx, y) => {
          ctx.save();
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#000000';
          ctx.textBaseline = 'top';
          let cursorY = y + 4;

          if (titleLines.length > 0) {
            ctx.font = titleFont;
            ctx.textAlign = block.align;
            const tx =
              block.align === 'center'
                ? THERMAL_WIDTH_PX / 2
                : block.align === 'right'
                  ? THERMAL_WIDTH_PX - PADDING_X
                  : PADDING_X;
            for (const tl of titleLines) {
              ctx.fillText(tl, tx, cursorY);
              cursorY += lineStep;
            }
            cursorY += 6;
          }

          ctx.font = font;
          ctx.textAlign = 'left';

          for (const entry of wrappedItems) {
            const boxX = PADDING_X;
            const boxSizeAdj = Math.max(14, Math.min(20, Math.round(block.fontSize * 0.85)));
            const boxY = cursorY + Math.max(0, Math.round((block.fontSize - boxSizeAdj) / 2));

            ctx.lineWidth = 2;
            ctx.strokeRect(boxX + 1, boxY + 1, boxSizeAdj - 2, boxSizeAdj - 2);

            if (entry.item.checked) {
              ctx.beginPath();
              ctx.lineWidth = 2;
              ctx.moveTo(boxX + 4, boxY + boxSizeAdj * 0.54);
              ctx.lineTo(boxX + boxSizeAdj * 0.44, boxY + boxSizeAdj - 4.5);
              ctx.lineTo(boxX + boxSizeAdj - 4, boxY + 4.5);
              ctx.stroke();
            }

            entry.lines.forEach((line, idx) => {
              const lineY = cursorY + idx * lineStep;
              ctx.fillText(line, PADDING_X + textIndent, lineY);
              if (entry.item.checked) {
                const w = ctx.measureText(line).width;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const strikeY = Math.round(lineY + block.fontSize * 0.5) + 0.5;
                ctx.moveTo(PADDING_X + textIndent, strikeY);
                ctx.lineTo(PADDING_X + textIndent + w, strikeY);
                ctx.stroke();
              }
            });

            cursorY += Math.max(1, entry.lines.length) * lineStep + 6;
          }

          ctx.restore();
        },
      });
      totalHeight += blockHeight;
      continue;
    }

    if (block.type === 'image') {
      const img = loadedImages.get(block.id);
      const targetWidth = Math.max(
        48,
        Math.min(CONTENT_WIDTH, Math.round((CONTENT_WIDTH * block.widthPercent) / 100)),
      );
      const targetHeight =
        img && img.naturalWidth > 0
          ? Math.max(24, Math.round((img.naturalHeight / img.naturalWidth) * targetWidth))
          : 72;

      const captionHeight = block.caption.trim() ? 22 : 0;
      const blockHeight = targetHeight + captionHeight + 12;

      steps.push({
        height: blockHeight,
        draw: (ctx, y) => {
          const x =
            block.align === 'center'
              ? Math.round((THERMAL_WIDTH_PX - targetWidth) / 2)
              : block.align === 'right'
                ? THERMAL_WIDTH_PX - PADDING_X - targetWidth
                : PADDING_X;

          if (img && img.naturalWidth > 0) {
            const dithered = renderDitheredImageData(img, targetWidth, targetHeight, block);
            ctx.putImageData(dithered, x, y + 4);
          } else {
            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x, y + 4, targetWidth, targetHeight);
            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('IMAGE SLOT', x + targetWidth / 2, y + 4 + targetHeight / 2);
            ctx.restore();
          }

          if (block.caption.trim()) {
            ctx.save();
            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.fillStyle = '#000000';
            ctx.textAlign = block.align;
            ctx.textBaseline = 'top';
            const cx =
              block.align === 'center'
                ? THERMAL_WIDTH_PX / 2
                : block.align === 'right'
                  ? THERMAL_WIDTH_PX - PADDING_X
                  : PADDING_X;
            ctx.fillText(block.caption.trim(), cx, y + 8 + targetHeight);
            ctx.restore();
          }
        },
      });
      totalHeight += blockHeight;
    }
  }

  totalHeight += PADDING_Y;
  const finalHeight = Math.max(80, totalHeight);

  canvas.width = THERMAL_WIDTH_PX;
  canvas.height = finalHeight;

  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) {
    throw new Error('Could not acquire 2D context for thermal canvas.');
  }

  // Fill pure white thermal paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, THERMAL_WIDTH_PX, finalHeight);

  let yCursor = PADDING_Y;
  for (const step of steps) {
    step.draw(ctx, yCursor);
    yCursor += step.height;
  }

  // Convert full canvas to 1-bit monochrome thermal buffer
  const imgData = ctx.getImageData(0, 0, THERMAL_WIDTH_PX, finalHeight);
  const gray = rgbaToGrayscale(imgData.data, THERMAL_WIDTH_PX, finalHeight, 0, 0, false);
  const monoBuffer = ditherGrayscaleBuffer(gray, THERMAL_WIDTH_PX, finalHeight, {
    ditherMode: options.ditherText ? 'floyd-steinberg' : 'threshold',
    threshold: 168,
  });

  // Render crisp 1-bit monochrome simulation back onto canvas so Preview == Thermal Print
  const previewData = ctx.createImageData(THERMAL_WIDTH_PX, finalHeight);
  for (let i = 0; i < monoBuffer.length; i++) {
    const isBlack = monoBuffer[i] === 1;
    const idx = i * 4;
    // Slight warm thermal paper off-white (#F6F6F2) & deep thermal carbon (#141517)
    previewData.data[idx] = isBlack ? 20 : 246;
    previewData.data[idx + 1] = isBlack ? 21 : 246;
    previewData.data[idx + 2] = isBlack ? 23 : 242;
    previewData.data[idx + 3] = 255;
  }
  ctx.putImageData(previewData, 0, 0);

  return {
    width: THERMAL_WIDTH_PX,
    height: finalHeight,
    paperLengthMm: estimatePaperLengthMm(finalHeight),
    monoBuffer,
  };
}

function renderDitheredImageData(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  block: ImageBlock,
): ImageData {
  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const octx = offscreen.getContext('2d', {willReadFrequently: true});
  if (!octx) {
    throw new Error('Could not create offscreen image processing canvas.');
  }

  octx.fillStyle = '#FFFFFF';
  octx.fillRect(0, 0, targetWidth, targetHeight);
  octx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const srcData = octx.getImageData(0, 0, targetWidth, targetHeight);
  const gray = rgbaToGrayscale(
    srcData.data,
    targetWidth,
    targetHeight,
    block.brightness,
    block.contrast,
    block.invert,
  );
  const effected = applyThermalImageEffects(gray, targetWidth, targetHeight, {
    gamma: block.gamma ?? 1.0,
    sharpen: block.sharpen ?? 0,
    sketchEdge: block.sketchEdge ?? false,
  });
  const mono = ditherGrayscaleBuffer(effected, targetWidth, targetHeight, {
    ditherMode: block.ditherMode,
    threshold: block.threshold,
  });

  const out = octx.createImageData(targetWidth, targetHeight);
  for (let i = 0; i < mono.length; i++) {
    const c = mono[i] === 1 ? 0 : 255;
    const idx = i * 4;
    out.data[idx] = c;
    out.data[idx + 1] = c;
    out.data[idx + 2] = c;
    out.data[idx + 3] = 255;
  }
  return out;
}

export function renderImageBlockEffectPreview(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  block: ImageBlock,
): void {
  if (!img.naturalWidth || !img.naturalHeight) return;
  const maxW = 240;
  const targetWidth = Math.min(maxW, Math.max(80, Math.round((maxW * block.widthPercent) / 100)));
  const targetHeight = Math.max(24, Math.round((img.naturalHeight / img.naturalWidth) * targetWidth));
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) return;
  const data = renderDitheredImageData(img, targetWidth, targetHeight, block);
  ctx.putImageData(data, 0, 0);
}

