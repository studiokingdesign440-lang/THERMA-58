import React, {useEffect, useRef, useState} from 'react';
import type {
  BluetoothPrinterState,
  ImageBlock,
  PrinterSettings,
  ReceiptDocument,
} from '../types/printer';
import {renderDocumentToCanvas} from '../utils/documentRenderer';
import {
  THERMAL_WIDTH_PX,
  encodeDocumentToEscPosText,
  formatEscPosHexPreview,
  packMonoToEscPosRaster,
} from '../utils/escpos';
import {DownloadIcon, EyeIcon, PrinterIcon, QueueIcon} from './Icons';

export interface CompiledPrintPayload {
  escPosData: Uint8Array;
  paperLengthMm: number;
  previewDataUrl: string;
}

interface ThermalPreviewProps {
  document: ReceiptDocument;
  settings: PrinterSettings;
  bluetooth: BluetoothPrinterState;
  mode: 'docked' | 'fullscreen';
  isPrinting: boolean;
  printProgress: {sent: number; total: number} | null;
  onUpdateSettings: (next: PrinterSettings) => void;
  onEnterPreviewMode?: () => void;
  onExitPreviewMode?: () => void;
  onPrintNow: (payload: CompiledPrintPayload) => void;
  onQueueJob: (payload: CompiledPrintPayload) => void;
  onExportedPayload?: (payload: CompiledPrintPayload) => void;
}

export const ThermalPreview: React.FC<ThermalPreviewProps> = ({
  document: doc,
  settings,
  bluetooth,
  mode,
  isPrinting,
  printProgress,
  onUpdateSettings,
  onEnterPreviewMode,
  onExitPreviewMode,
  onPrintNow,
  onQueueJob,
  onExportedPayload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paperLengthMm, setPaperLengthMm] = useState(40);
  const [compiledBytes, setCompiledBytes] = useState<Uint8Array>(new Uint8Array());
  const [zoom, setZoom] = useState<1 | 1.35>(1);
  const [showHex, setShowHex] = useState(false);
  const [imageTick, setImageTick] = useState(0);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Load any image blocks into HTMLImageElement cache
  useEffect(() => {
    let active = true;
    const imageBlocks = doc.blocks.filter((b): b is ImageBlock => b.type === 'image');

    for (const blk of imageBlocks) {
      const src = blk.dataUrl || '';
      if (!src) {
        loadedImagesRef.current.delete(blk.id);
        continue;
      }
      const existing = loadedImagesRef.current.get(blk.id);
      if (existing && existing.src === src && existing.complete) {
        continue;
      }
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        loadedImagesRef.current.set(blk.id, img);
        setImageTick((t) => t + 1);
      };
      img.src = src;
    }

    return () => {
      active = false;
    };
  }, [doc.blocks]);

  // Render receipt canvas and compile ESC/POS bytes whenever document or settings change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = renderDocumentToCanvas(doc.blocks, canvas, loadedImagesRef.current);
    setPaperLengthMm(result.paperLengthMm);

    const bytes =
      settings.outputMode === 'raster'
        ? packMonoToEscPosRaster(result.monoBuffer, result.width, result.height, {
            feedLinesAfter: settings.feedLinesAfter,
            autoCut: settings.autoCut,
          })
        : encodeDocumentToEscPosText(doc.blocks, settings);

    setCompiledBytes(bytes);
  }, [doc.blocks, settings, imageTick]);

  const buildPayload = (): CompiledPrintPayload => {
    const canvas = canvasRef.current;
    const previewDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    return {
      escPosData: compiledBytes,
      paperLengthMm,
      previewDataUrl,
    };
  };

  const handleDownloadBin = () => {
    const copy = new Uint8Array(compiledBytes);
    const blob = new Blob([copy], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${(doc.title || 'therma-58-receipt').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bin`;
    a.click();
    URL.revokeObjectURL(url);
    onExportedPayload?.(buildPayload());
  };

  const payloadKb = (compiledBytes.length / 1024).toFixed(1);

  return (
    <aside
      aria-label="58mm Thermal Paper Preview"
      className="rounded-[4px] border border-[#232930] bg-[#111418] flex flex-col"
    >
      {/* Top Meta & Mode Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-[#232930] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-[#E6EDF3] truncate">
            {mode === 'fullscreen' ? 'Pre-Print 58mm Inspection' : '58mm Live Roll Preview'}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#8B949E] tabular-nums truncate">
            {mode === 'fullscreen'
              ? `${THERMAL_WIDTH_PX}px · ${paperLengthMm} mm · ${payloadKb} KB · ${
                  settings.outputMode === 'raster' ? 'Raster Bitmap' : 'ESC/POS Text'
                }`
              : `${THERMAL_WIDTH_PX}px · ${paperLengthMm} mm · ${payloadKb} KB`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'docked' && onEnterPreviewMode && (
            <button
              type="button"
              onClick={onEnterPreviewMode}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3] whitespace-nowrap"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              Preview Mode
            </button>
          )}
          {mode === 'fullscreen' && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => (z === 1 ? 1.35 : 1))}
                className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3] tabular-nums"
              >
                Zoom {Math.round(zoom * 100)}%
              </button>
              {onExitPreviewMode && (
                <button
                  type="button"
                  onClick={onExitPreviewMode}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:text-[#E6EDF3]"
                >
                  Back to Editor
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher in Fullscreen Preview */}
      {mode === 'fullscreen' && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232930] bg-[#0D1014] px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-[4px] border border-[#30363D] bg-[#161B22] p-0.5">
            <button
              type="button"
              onClick={() => onUpdateSettings({...settings, outputMode: 'raster'})}
              className={`min-h-[32px] px-3 text-xs font-medium rounded-[3px] transition-colors ${
                settings.outputMode === 'raster'
                  ? 'bg-[#E6EDF3] text-[#090B0D]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Raster (Exact WYSIWYG)
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({...settings, outputMode: 'escpos-text'})}
              className={`min-h-[32px] px-3 text-xs font-medium rounded-[3px] transition-colors ${
                settings.outputMode === 'escpos-text'
                  ? 'bg-[#E6EDF3] text-[#090B0D]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              ESC/POS Text
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHex((v) => !v)}
              className="min-h-[34px] px-3 text-xs rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3]"
            >
              {showHex ? 'Hide ESC/POS Hex' : 'Inspect ESC/POS Hex'}
            </button>
            <button
              type="button"
              onClick={handleDownloadBin}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 text-xs rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Export .bin
            </button>
          </div>
        </div>
      )}

      {/* Thermal Paper Viewport */}
      <div className="flex-1 overflow-auto bg-[#090B0D] p-5 flex flex-col items-center">
        <div
          style={{
            width: `${Math.round(THERMAL_WIDTH_PX * zoom)}px`,
            maxWidth: '100%',
          }}
          className="transition-transform"
        >
          <div className="h-[10px] w-full thermal-tear-top" aria-hidden="true" />
          <div className="bg-[#F6F6F2] shadow-2xl">
            <canvas
              ref={canvasRef}
              data-testid="thermal-preview-canvas"
              className="block w-full h-auto"
              style={{imageRendering: 'pixelated'}}
            />
          </div>
          <div className="h-[10px] w-full thermal-tear-bottom" aria-hidden="true" />
        </div>

        {showHex && mode === 'fullscreen' && (
          <div className="mt-5 w-full max-w-2xl rounded-[4px] border border-[#232930] bg-[#111418] p-3">
            <p className="text-[11px] font-semibold text-[#8B949E] mb-1.5">
              Raw ESC/POS Payload ({compiledBytes.length} bytes)
            </p>
            <pre className="text-[11px] leading-relaxed text-[#E6EDF3] whitespace-pre-wrap break-all tabular-nums">
              {formatEscPosHexPreview(compiledBytes, 240)}
            </pre>
          </div>
        )}
      </div>

      {/* Print Progress */}
      {isPrinting && printProgress && (
        <div className="border-t border-[#232930] bg-[#0D1014] px-4 py-2.5 space-y-1.5">
          <div className="flex justify-between text-xs text-[#E6EDF3] tabular-nums">
            <span>Transmitting over Web Bluetooth...</span>
            <span>
              {Math.round((printProgress.sent / Math.max(1, printProgress.total)) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#232930] overflow-hidden">
            <div
              className="h-full bg-[#22C55E] transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((printProgress.sent / Math.max(1, printProgress.total)) * 100),
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#232930] bg-[#111418] px-4 py-3">
        <button
          type="button"
          onClick={() => onQueueJob(buildPayload())}
          className="inline-flex items-center gap-2 min-h-[42px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3] whitespace-nowrap"
        >
          <QueueIcon className="w-3.5 h-3.5" />
          Save to Queue
        </button>

        <button
          type="button"
          disabled={isPrinting || compiledBytes.length === 0}
          onClick={() => onPrintNow(buildPayload())}
          className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 text-xs font-semibold rounded-[4px] bg-[#22C55E] text-[#090B0D] hover:bg-[#16A34A] disabled:opacity-50 whitespace-nowrap"
        >
          <PrinterIcon className="w-4 h-4" />
          {isPrinting
            ? 'Printing...'
            : bluetooth.connected
              ? 'Send to Printer'
              : 'Queue & Connect'}
        </button>
      </div>
    </aside>
  );
};
