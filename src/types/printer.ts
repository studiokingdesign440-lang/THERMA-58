export type FontFamilyId = 'jetbrains' | 'ibm-plex' | 'courier' | 'sans' | 'serif';

export type TextAlign = 'left' | 'center' | 'right';

export type DitherMode = 'floyd-steinberg' | 'atkinson' | 'bayer' | 'threshold';

export type ImageEffectPreset =
  | 'atkinson-detail'
  | 'photo-balanced'
  | 'crisp-line'
  | 'halftone-newsprint'
  | 'sketch-outline'
  | 'negative-stamp'
  | 'custom';

export type DividerStyle = 'dashed' | 'solid' | 'double' | 'dotted';

export type PrintOutputMode = 'raster' | 'escpos-text';

export interface TextFormatting {
  fontFamily: FontFamilyId;
  fontSize: number; // px on 384px thermal canvas (12 - 48)
  lineHeight: number; // multiplier (1.0 - 2.4)
  bold: boolean;
  italic: boolean;
  align: TextAlign;
}

export interface TextBlock extends TextFormatting {
  id: string;
  type: 'text';
  content: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistBlock extends TextFormatting {
  id: string;
  type: 'checklist';
  title: string;
  items: ChecklistItem[];
}

export interface ImageBlock {
  id: string;
  type: 'image';
  sourceType: 'upload' | 'url';
  sourceUrl: string;
  dataUrl: string; // cached locally for offline sync & rendering
  fileName: string;
  align: TextAlign;
  widthPercent: number; // 25 - 100
  ditherMode: DitherMode;
  effectPreset?: ImageEffectPreset;
  threshold: number; // 0 - 255
  brightness: number; // -100 - 100
  contrast: number; // -100 - 100
  sharpen?: number; // 0 - 100
  gamma?: number; // 0.5 - 2.0
  sketchEdge?: boolean; // edge outline / ink-saver thermal mode
  invert: boolean;
  caption: string;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
  style: DividerStyle;
  spacingY: number;
}

export type PrintBlock = TextBlock | ChecklistBlock | ImageBlock | DividerBlock;

export interface ReceiptDocument {
  id: string;
  title: string;
  updatedAt: number;
  blocks: PrintBlock[];
}

export type TemplateCategory = 'receipt' | 'report' | 'checklist' | 'custom';

export interface PrintTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  builtIn: boolean;
  createdAt: number;
  blocks: PrintBlock[];
}

export interface PrinterSettings {
  paperWidthPx: 384; // 58mm standard printable dots
  outputMode: PrintOutputMode;
  feedLinesAfter: number;
  autoCut: boolean;
  chunkSizeBytes: number;
  chunkDelayMs: number;
  autoSyncOnReconnect: boolean;
}

export type PrintJobStatus = 'queued' | 'printing' | 'printed' | 'failed';

export interface PrintJob {
  id: string;
  documentId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  status: PrintJobStatus;
  outputMode: PrintOutputMode;
  payloadBytes: number;
  paperLengthMm: number;
  escPosData: Uint8Array;
  previewDataUrl?: string;
  blocksSnapshot?: PrintBlock[];
  errorMessage?: string;
  attempts: number;
}

export type HistoryRecordSource = 'bluetooth' | 'exported';

export interface PrintHistoryEntry {
  id: string;
  title: string;
  printedAt: number;
  source: HistoryRecordSource;
  deviceName: string;
  outputMode: PrintOutputMode;
  payloadBytes: number;
  paperLengthMm: number;
  escPosData: Uint8Array;
  previewDataUrl?: string;
  blocksSnapshot?: PrintBlock[];
}

export interface BluetoothPrinterState {
  supported: boolean;
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
  lastError: string | null;
}

export type WorkspaceTab = 'compose' | 'templates' | 'preview' | 'queue' | 'history';
