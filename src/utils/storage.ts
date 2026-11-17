import type {
  PrintHistoryEntry,
  PrintJob,
  PrintTemplate,
  PrinterSettings,
  ReceiptDocument,
} from '../types/printer';

const DB_NAME = 'therma58_offline_db';
const DB_VERSION = 2;
const STORE_DRAFTS = 'drafts';
const STORE_QUEUE = 'print_queue';
const STORE_SETTINGS = 'settings';
const STORE_IMAGE_CACHE = 'image_cache';
const STORE_TEMPLATES = 'templates';
const STORE_HISTORY = 'print_history';

const ACTIVE_DOC_KEY = 'active_document';
const SETTINGS_KEY = 'printer_settings';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperWidthPx: 384,
  outputMode: 'raster',
  feedLinesAfter: 3,
  autoCut: true,
  chunkSizeBytes: 100,
  chunkDelayMs: 18,
  autoSyncOnReconnect: true,
};

export function createDefaultDocument(): ReceiptDocument {
  return {
    id: 'doc-default-01',
    title: 'Field Dispatch Slip',
    updatedAt: Date.now(),
    blocks: [
      {
        id: 'blk-header',
        type: 'text',
        content: 'THERMA 58 · TERMINAL PRINT',
        fontFamily: 'jetbrains',
        fontSize: 22,
        lineHeight: 1.25,
        bold: true,
        italic: false,
        align: 'center',
      },
      {
        id: 'blk-sub',
        type: 'text',
        content: '58mm Direct Thermal Workstation',
        fontFamily: 'ibm-plex',
        fontSize: 14,
        lineHeight: 1.35,
        bold: false,
        italic: true,
        align: 'center',
      },
      {
        id: 'blk-div-1',
        type: 'divider',
        style: 'dashed',
        spacingY: 6,
      },
      {
        id: 'blk-checklist-1',
        type: 'checklist',
        title: 'Pre-Flight Checklist',
        fontFamily: 'jetbrains',
        fontSize: 16,
        lineHeight: 1.45,
        bold: false,
        italic: false,
        align: 'left',
        items: [
          {id: 'chk-1', text: 'Load 58mm thermal paper roll', checked: true},
          {id: 'chk-2', text: 'Pair Bluetooth BLE printer', checked: false},
          {id: 'chk-3', text: 'Verify preview before print', checked: false},
        ],
      },
      {
        id: 'blk-div-2',
        type: 'divider',
        style: 'dotted',
        spacingY: 6,
      },
      {
        id: 'blk-note',
        type: 'text',
        content: 'Ready for offline composition and queued Web Bluetooth dispatch.',
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.4,
        bold: false,
        italic: false,
        align: 'left',
      },
    ],
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, {keyPath: 'key'});
      }
      if (!db.objectStoreNames.contains(STORE_IMAGE_CACHE)) {
        db.createObjectStore(STORE_IMAGE_CACHE, {keyPath: 'url'});
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, {keyPath: 'id'});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function loadActiveDocument(): Promise<ReceiptDocument> {
  try {
    const record = await idbGet<{id: string; document: ReceiptDocument}>(
      STORE_DRAFTS,
      ACTIVE_DOC_KEY,
    );
    if (record?.document) {
      return record.document;
    }
  } catch {
    const raw = localStorage.getItem(`therma58_${ACTIVE_DOC_KEY}`);
    if (raw) {
      try {
        return JSON.parse(raw) as ReceiptDocument;
      } catch {
        // fall through to default
      }
    }
  }
  return createDefaultDocument();
}

export async function saveActiveDocument(document: ReceiptDocument): Promise<void> {
  const payload = {...document, updatedAt: Date.now()};
  try {
    await idbPut(STORE_DRAFTS, {id: ACTIVE_DOC_KEY, document: payload});
  } catch {
    localStorage.setItem(`therma58_${ACTIVE_DOC_KEY}`, JSON.stringify(payload));
  }
}

export async function loadPrinterSettings(): Promise<PrinterSettings> {
  try {
    const record = await idbGet<{key: string; value: PrinterSettings}>(
      STORE_SETTINGS,
      SETTINGS_KEY,
    );
    if (record?.value) {
      return {...DEFAULT_PRINTER_SETTINGS, ...record.value};
    }
  } catch {
    const raw = localStorage.getItem(`therma58_${SETTINGS_KEY}`);
    if (raw) {
      try {
        return {...DEFAULT_PRINTER_SETTINGS, ...(JSON.parse(raw) as PrinterSettings)};
      } catch {
        // fall through
      }
    }
  }
  return DEFAULT_PRINTER_SETTINGS;
}

export async function savePrinterSettings(settings: PrinterSettings): Promise<void> {
  try {
    await idbPut(STORE_SETTINGS, {key: SETTINGS_KEY, value: settings});
  } catch {
    localStorage.setItem(`therma58_${SETTINGS_KEY}`, JSON.stringify(settings));
  }
}

interface StoredPrintJob extends Omit<PrintJob, 'escPosData'> {
  escPosBuffer: ArrayBuffer;
}

export async function loadPrintQueue(): Promise<PrintJob[]> {
  try {
    const rows = await idbGetAll<StoredPrintJob>(STORE_QUEUE);
    return rows
      .map((row) => ({
        ...row,
        escPosData: new Uint8Array(row.escPosBuffer),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function savePrintJob(job: PrintJob): Promise<void> {
  const buffer = job.escPosData.buffer.slice(
    job.escPosData.byteOffset,
    job.escPosData.byteOffset + job.escPosData.byteLength,
  ) as ArrayBuffer;
  const stored: StoredPrintJob = {
    id: job.id,
    documentId: job.documentId,
    title: job.title,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    status: job.status,
    outputMode: job.outputMode,
    payloadBytes: job.payloadBytes,
    paperLengthMm: job.paperLengthMm,
    previewDataUrl: job.previewDataUrl,
    blocksSnapshot: job.blocksSnapshot,
    errorMessage: job.errorMessage,
    attempts: job.attempts,
    escPosBuffer: buffer,
  };
  await idbPut(STORE_QUEUE, stored);
}

export async function deletePrintJob(id: string): Promise<void> {
  await idbDelete(STORE_QUEUE, id);
}

export async function loadCustomTemplates(): Promise<PrintTemplate[]> {
  try {
    const rows = await idbGetAll<PrintTemplate>(STORE_TEMPLATES);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveCustomTemplate(template: PrintTemplate): Promise<void> {
  await idbPut(STORE_TEMPLATES, template);
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  await idbDelete(STORE_TEMPLATES, id);
}

interface StoredHistoryEntry extends Omit<PrintHistoryEntry, 'escPosData'> {
  escPosBuffer: ArrayBuffer;
}

export async function loadPrintHistory(): Promise<PrintHistoryEntry[]> {
  try {
    const rows = await idbGetAll<StoredHistoryEntry>(STORE_HISTORY);
    return rows
      .map((row) => ({
        ...row,
        escPosData: new Uint8Array(row.escPosBuffer),
      }))
      .sort((a, b) => b.printedAt - a.printedAt);
  } catch {
    return [];
  }
}

export async function savePrintHistoryEntry(entry: PrintHistoryEntry): Promise<void> {
  const buffer = entry.escPosData.buffer.slice(
    entry.escPosData.byteOffset,
    entry.escPosData.byteOffset + entry.escPosData.byteLength,
  ) as ArrayBuffer;
  const stored: StoredHistoryEntry = {
    id: entry.id,
    title: entry.title,
    printedAt: entry.printedAt,
    source: entry.source,
    deviceName: entry.deviceName,
    outputMode: entry.outputMode,
    payloadBytes: entry.payloadBytes,
    paperLengthMm: entry.paperLengthMm,
    previewDataUrl: entry.previewDataUrl,
    blocksSnapshot: entry.blocksSnapshot,
    escPosBuffer: buffer,
  };
  await idbPut(STORE_HISTORY, stored);
}

export async function deletePrintHistoryEntry(id: string): Promise<void> {
  await idbDelete(STORE_HISTORY, id);
}

export async function clearPrintHistory(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function cacheRemoteImageDataUrl(url: string, dataUrl: string): Promise<void> {
  try {
    await idbPut(STORE_IMAGE_CACHE, {url, dataUrl, cachedAt: Date.now()});
  } catch {
    // non-fatal
  }
}

export async function getCachedRemoteImageDataUrl(url: string): Promise<string | null> {
  try {
    const entry = await idbGet<{url: string; dataUrl: string}>(STORE_IMAGE_CACHE, url);
    return entry?.dataUrl ?? null;
  } catch {
    return null;
  }
}
