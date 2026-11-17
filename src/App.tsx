import {useCallback, useEffect, useState} from 'react';
import {BlockEditor} from './components/BlockEditor';
import {BluetoothModal} from './components/BluetoothModal';
import {Header} from './components/Header';
import {
  EyeIcon,
  HistoryIcon,
  QueueIcon,
  TemplateIcon,
  TextBlockIcon,
} from './components/Icons';
import {OfflineIndicator, PWAInstallButton} from './components/PWAInstallButton';
import {PrintHistoryView} from './components/PrintHistoryView';
import {PrintQueueView} from './components/PrintQueueView';
import {TemplatesView} from './components/TemplatesView';
import {type CompiledPrintPayload, ThermalPreview} from './components/ThermalPreview';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import type {
  BluetoothPrinterState,
  HistoryRecordSource,
  PrintHistoryEntry,
  PrintJob,
  PrintTemplate,
  PrinterSettings,
  ReceiptDocument,
  TemplateCategory,
  WorkspaceTab,
} from './types/printer';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  isPrinterConnected,
  isWebBluetoothSupported,
  sendBytesToPrinter,
} from './utils/bluetooth';
import {
  DEFAULT_PRINTER_SETTINGS,
  clearPrintHistory,
  createDefaultDocument,
  deleteCustomTemplate,
  deletePrintHistoryEntry,
  deletePrintJob,
  loadActiveDocument,
  loadCustomTemplates,
  loadPrintHistory,
  loadPrintQueue,
  loadPrinterSettings,
  saveActiveDocument,
  saveCustomTemplate,
  savePrintHistoryEntry,
  savePrintJob,
  savePrinterSettings,
} from './utils/storage';
import {BUILTIN_TEMPLATES, cloneBlocksWithNewIds} from './utils/templates';

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('compose');
  const [doc, setDoc] = useState<ReceiptDocument>(createDefaultDocument);
  const [docLoaded, setDocLoaded] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('blk-header');
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PrintTemplate[]>([]);
  const [history, setHistory] = useState<PrintHistoryEntry[]>([]);
  const [bluetoothModalOpen, setBluetoothModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [printProgress, setPrintProgress] = useState<{sent: number; total: number} | null>(
    null,
  );
  const [notice, setNotice] = useState<{type: 'ok' | 'warn' | 'err'; text: string} | null>(
    null,
  );

  const [bluetooth, setBluetooth] = useState<BluetoothPrinterState>(() => ({
    supported: isWebBluetoothSupported(),
    connected: false,
    connecting: false,
    deviceName: null,
    deviceId: null,
    serviceUuid: null,
    characteristicUuid: null,
    lastError: null,
  }));

  // Initial hydration from IndexedDB
  useEffect(() => {
    let active = true;
    Promise.all([
      loadActiveDocument(),
      loadPrinterSettings(),
      loadPrintQueue(),
      loadCustomTemplates(),
      loadPrintHistory(),
    ]).then(
      ([
        loadedDoc,
        loadedSettings,
        loadedJobs,
        loadedTemplates,
        loadedHistory,
      ]) => {
        if (!active) return;
        setDoc(loadedDoc);
        setSelectedBlockId(loadedDoc.blocks[0]?.id ?? null);
        setSettings(loadedSettings);
        setJobs(loadedJobs);
        setCustomTemplates(loadedTemplates);
        setHistory(loadedHistory);
        setDocLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Auto-save document draft offline whenever edited
  useEffect(() => {
    if (!docLoaded) return;
    const timer = window.setTimeout(() => {
      saveActiveDocument(doc);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [doc, docLoaded]);

  // Auto-save printer settings
  const handleUpdateSettings = useCallback((next: PrinterSettings) => {
    setSettings(next);
    savePrinterSettings(next);
  }, []);

  const showNotice = useCallback((type: 'ok' | 'warn' | 'err', text: string) => {
    setNotice({type, text});
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const recordPrintHistory = useCallback(
    async (
      params: {
        title: string;
        source: HistoryRecordSource;
        deviceName: string;
        outputMode: PrinterSettings['outputMode'];
        payloadBytes: number;
        paperLengthMm: number;
        escPosData: Uint8Array;
        previewDataUrl?: string;
        blocksSnapshot?: ReceiptDocument['blocks'];
      },
    ) => {
      const entry: PrintHistoryEntry = {
        id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: params.title || 'Untitled Receipt',
        printedAt: Date.now(),
        source: params.source,
        deviceName: params.deviceName,
        outputMode: params.outputMode,
        payloadBytes: params.payloadBytes,
        paperLengthMm: params.paperLengthMm,
        escPosData: params.escPosData,
        previewDataUrl: params.previewDataUrl,
        blocksSnapshot: params.blocksSnapshot
          ? cloneBlocksWithNewIds(params.blocksSnapshot)
          : undefined,
      };
      await savePrintHistoryEntry(entry);
      setHistory((prev) => [entry, ...prev]);
    },
    [],
  );

  const executeJobPrint = useCallback(
    async (job: PrintJob): Promise<PrintJob> => {
      const printingJob: PrintJob = {...job, status: 'printing', updatedAt: Date.now()};
      setJobs((prev) => prev.map((j) => (j.id === job.id ? printingJob : j)));

      try {
        setIsPrinting(true);
        setPrintProgress({sent: 0, total: job.escPosData.length});
        await sendBytesToPrinter(job.escPosData, settings, (sent, total) => {
          setPrintProgress({sent, total});
        });

        const doneJob: PrintJob = {
          ...printingJob,
          status: 'printed',
          updatedAt: Date.now(),
          attempts: job.attempts + 1,
          errorMessage: undefined,
        };
        await savePrintJob(doneJob);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? doneJob : j)));

        await recordPrintHistory({
          title: job.title,
          source: 'bluetooth',
          deviceName: bluetooth.deviceName || '58mm BLE Printer',
          outputMode: job.outputMode,
          payloadBytes: job.payloadBytes,
          paperLengthMm: job.paperLengthMm,
          escPosData: job.escPosData,
          previewDataUrl: job.previewDataUrl,
          blocksSnapshot: job.blocksSnapshot,
        });

        return doneJob;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Bluetooth transmission failed.';
        const failedJob: PrintJob = {
          ...printingJob,
          status: 'failed',
          updatedAt: Date.now(),
          attempts: job.attempts + 1,
          errorMessage: message,
        };
        await savePrintJob(failedJob);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? failedJob : j)));
        throw err;
      } finally {
        setIsPrinting(false);
        setPrintProgress(null);
      }
    },
    [settings, bluetooth.deviceName, recordPrintHistory],
  );

  const handleSyncQueuedJobs = useCallback(
    async (currentJobs?: PrintJob[]) => {
      if (!isPrinterConnected()) {
        setBluetoothModalOpen(true);
        return;
      }

      const list = currentJobs ?? jobs;
      const pending = list.filter((j) => j.status === 'queued' || j.status === 'failed');
      if (pending.length === 0) return;

      setIsSyncing(true);
      let successCount = 0;
      for (const job of [...pending].reverse()) {
        try {
          await executeJobPrint(job);
          successCount++;
        } catch {
          break;
        }
      }
      setIsSyncing(false);

      if (successCount > 0) {
        showNotice('ok', `Synced and printed ${successCount} queued job(s).`);
      }
    },
    [jobs, executeJobPrint, showNotice],
  );

  const handleConnectBluetooth = async () => {
    setBluetooth((prev) => ({...prev, connecting: true, lastError: null}));
    try {
      const state = await connectBluetoothPrinter(() => {
        setBluetooth((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
          deviceName: null,
          deviceId: null,
          serviceUuid: null,
          characteristicUuid: null,
        }));
        showNotice('warn', 'Bluetooth printer disconnected.');
      });
      setBluetooth(state);
      showNotice('ok', `Connected to ${state.deviceName}.`);

      if (settings.autoSyncOnReconnect) {
        const latestJobs = await loadPrintQueue();
        if (latestJobs.some((j) => j.status === 'queued')) {
          await handleSyncQueuedJobs(latestJobs);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bluetooth pairing cancelled or failed.';
      setBluetooth((prev) => ({...prev, connecting: false, lastError: msg}));
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothPrinter();
    setBluetooth((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
      deviceName: null,
      deviceId: null,
      serviceUuid: null,
      characteristicUuid: null,
    }));
    showNotice('warn', 'Printer disconnected.');
  };

  const handleTestFeed = async () => {
    if (!isPrinterConnected()) return;
    try {
      const msg = new TextEncoder().encode('THERMA 58 BLE TEST OK\n');
      const payload = new Uint8Array([0x1b, 0x40, ...msg, 0x1b, 0x64, 3]);
      await sendBytesToPrinter(payload, settings);
      showNotice('ok', 'Sent test feed to printer.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Test feed failed.');
    }
  };

  const createJobFromPayload = (
    payload: CompiledPrintPayload,
    status: PrintJob['status'],
  ): PrintJob => {
    const now = Date.now();
    return {
      id: `job-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      documentId: doc.id,
      title: doc.title || 'Untitled Receipt',
      createdAt: now,
      updatedAt: now,
      status,
      outputMode: settings.outputMode,
      payloadBytes: payload.escPosData.length,
      paperLengthMm: payload.paperLengthMm,
      escPosData: payload.escPosData,
      previewDataUrl: payload.previewDataUrl,
      blocksSnapshot: cloneBlocksWithNewIds(doc.blocks),
      attempts: 0,
    };
  };

  const handleQueueJob = async (payload: CompiledPrintPayload) => {
    const job = createJobFromPayload(payload, 'queued');
    await savePrintJob(job);
    setJobs((prev) => [job, ...prev]);
    showNotice('ok', 'Saved print job to offline queue.');
  };

  const handlePrintNow = async (payload: CompiledPrintPayload) => {
    const job = createJobFromPayload(payload, 'queued');
    await savePrintJob(job);
    setJobs((prev) => [job, ...prev]);

    if (!isPrinterConnected()) {
      setBluetoothModalOpen(true);
      showNotice(
        'warn',
        'Job queued offline. Connect your 58mm Bluetooth printer to transmit.',
      );
      return;
    }

    try {
      await executeJobPrint(job);
      showNotice('ok', 'Printed receipt to 58mm device.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Print failed. Job saved in queue.');
    }
  };

  const handleExportedPayload = async (payload: CompiledPrintPayload) => {
    await recordPrintHistory({
      title: doc.title || 'Untitled Receipt',
      source: 'exported',
      deviceName: 'Offline .bin Export',
      outputMode: settings.outputMode,
      payloadBytes: payload.escPosData.length,
      paperLengthMm: payload.paperLengthMm,
      escPosData: payload.escPosData,
      previewDataUrl: payload.previewDataUrl,
      blocksSnapshot: doc.blocks,
    });
    showNotice('ok', 'Exported ESC/POS binary and logged to Print History.');
  };

  const handlePrintQueuedJob = async (job: PrintJob) => {
    if (!isPrinterConnected()) {
      setBluetoothModalOpen(true);
      showNotice('warn', 'Connect your 58mm Bluetooth printer first.');
      return;
    }
    try {
      await executeJobPrint(job);
      showNotice('ok', `Printed "${job.title}".`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Print failed.');
    }
  };

  const handleDeleteJob = async (id: string) => {
    await deletePrintJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleClearCompleted = async () => {
    const completed = jobs.filter((j) => j.status === 'printed');
    await Promise.all(completed.map((j) => deletePrintJob(j.id)));
    setJobs((prev) => prev.filter((j) => j.status !== 'printed'));
  };

  // Templates Handlers
  const handleLoadTemplate = (template: PrintTemplate) => {
    const clonedBlocks = cloneBlocksWithNewIds(template.blocks);
    setDoc({
      id: `doc-${Date.now().toString(36)}`,
      title: template.name,
      updatedAt: Date.now(),
      blocks: clonedBlocks,
    });
    setSelectedBlockId(clonedBlocks[0]?.id ?? null);
    setActiveTab('compose');
    showNotice('ok', `Loaded "${template.name}" into composer.`);
  };

  const handleSaveAsTemplate = async (
    name: string,
    category: TemplateCategory,
    description: string,
  ) => {
    const tpl: PrintTemplate = {
      id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      category,
      description,
      builtIn: false,
      createdAt: Date.now(),
      blocks: cloneBlocksWithNewIds(doc.blocks),
    };
    await saveCustomTemplate(tpl);
    setCustomTemplates((prev) => [tpl, ...prev]);
    showNotice('ok', `Saved template "${name}".`);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteCustomTemplate(id);
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    showNotice('warn', 'Removed custom template.');
  };

  // Print History Handlers
  const handleReprintHistory = async (entry: PrintHistoryEntry) => {
    const job: PrintJob = {
      id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      documentId: doc.id,
      title: entry.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'queued',
      outputMode: entry.outputMode,
      payloadBytes: entry.payloadBytes,
      paperLengthMm: entry.paperLengthMm,
      escPosData: entry.escPosData,
      previewDataUrl: entry.previewDataUrl,
      blocksSnapshot: entry.blocksSnapshot,
      attempts: 0,
    };
    await savePrintJob(job);
    setJobs((prev) => [job, ...prev]);

    if (!isPrinterConnected()) {
      setBluetoothModalOpen(true);
      showNotice('warn', `Queued reprint of "${entry.title}". Connect printer to send.`);
      return;
    }

    try {
      await executeJobPrint(job);
      showNotice('ok', `Reprinted "${entry.title}".`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Reprint failed.');
    }
  };

  const handleRestoreHistoryToEditor = (entry: PrintHistoryEntry) => {
    if (!entry.blocksSnapshot || entry.blocksSnapshot.length === 0) return;
    const restored = cloneBlocksWithNewIds(entry.blocksSnapshot);
    setDoc({
      id: `doc-${Date.now().toString(36)}`,
      title: entry.title,
      updatedAt: Date.now(),
      blocks: restored,
    });
    setSelectedBlockId(restored[0]?.id ?? null);
    setActiveTab('compose');
    showNotice('ok', `Restored "${entry.title}" into composer.`);
  };

  const handleDeleteHistoryEntry = async (id: string) => {
    await deletePrintHistoryEntry(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearHistory = async () => {
    await clearPrintHistory();
    setHistory([]);
    showNotice('warn', 'Cleared print history.');
  };

  const pendingQueueCount = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'failed',
  ).length;

  return (
    <div className="min-h-screen bg-[#090B0D] text-[#E6EDF3] flex flex-col">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        queuedCount={pendingQueueCount}
        historyCount={history.length}
        bluetooth={bluetooth}
        onOpenBluetooth={() => setBluetoothModalOpen(true)}
      />

      {/* Utility Strip: Offline Indicator, Notice Toast & PWA Install */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <OfflineIndicator />
          {notice && (
            <div
              role="status"
              className={`rounded-[4px] border px-3 py-1.5 text-xs ${
                notice.type === 'ok'
                  ? 'border-[#22C55E]/50 bg-[#22C55E]/10 text-[#E6EDF3]'
                  : notice.type === 'warn'
                    ? 'border-[#D97706]/50 bg-[#D97706]/10 text-[#E6EDF3]'
                    : 'border-[#DC2626]/50 bg-[#DC2626]/10 text-[#F87171]'
              }`}
            >
              {notice.text}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Workspace */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 pb-24 md:pb-8 sm:px-6">
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px] gap-6 items-start">
            <BlockEditor
              document={doc}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onChangeDocument={setDoc}
              onOpenTemplates={() => setActiveTab('templates')}
              onResetSample={() => {
                const fresh = createDefaultDocument();
                setDoc(fresh);
                setSelectedBlockId(fresh.blocks[0]?.id ?? null);
                showNotice('ok', 'Restored default sample receipt.');
              }}
            />

            <div className="lg:sticky lg:top-[76px]">
              <ThermalPreview
                document={doc}
                settings={settings}
                bluetooth={bluetooth}
                mode="docked"
                isPrinting={isPrinting}
                printProgress={printProgress}
                onUpdateSettings={handleUpdateSettings}
                onEnterPreviewMode={() => setActiveTab('preview')}
                onPrintNow={handlePrintNow}
                onQueueJob={handleQueueJob}
                onExportedPayload={handleExportedPayload}
              />
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="mx-auto max-w-4xl">
            <TemplatesView
              currentDoc={doc}
              builtInTemplates={BUILTIN_TEMPLATES}
              customTemplates={customTemplates}
              onLoadTemplate={handleLoadTemplate}
              onSaveAsTemplate={handleSaveAsTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="mx-auto max-w-3xl">
            <ThermalPreview
              document={doc}
              settings={settings}
              bluetooth={bluetooth}
              mode="fullscreen"
              isPrinting={isPrinting}
              printProgress={printProgress}
              onUpdateSettings={handleUpdateSettings}
              onExitPreviewMode={() => setActiveTab('compose')}
              onPrintNow={handlePrintNow}
              onQueueJob={handleQueueJob}
              onExportedPayload={handleExportedPayload}
            />
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="mx-auto max-w-4xl">
            <PrintQueueView
              jobs={jobs}
              bluetooth={bluetooth}
              isOnline={isOnline}
              isSyncing={isSyncing}
              onSyncAll={() => handleSyncQueuedJobs()}
              onPrintJob={handlePrintQueuedJob}
              onDeleteJob={handleDeleteJob}
              onClearCompleted={handleClearCompleted}
              onReturnToEditor={() => setActiveTab('compose')}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="mx-auto max-w-4xl">
            <PrintHistoryView
              entries={history}
              onReprint={handleReprintHistory}
              onRestoreToEditor={handleRestoreHistoryToEditor}
              onDeleteEntry={handleDeleteHistoryEntry}
              onClearHistory={handleClearHistory}
              onReturnToEditor={() => setActiveTab('compose')}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (5 compact tabs, <=15% height) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#232930] bg-[#090B0D]/95 backdrop-blur-sm"
      >
        <div className="grid grid-cols-5 h-14">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              activeTab === 'compose' ? 'text-[#22C55E]' : 'text-[#8B949E]'
            }`}
          >
            <TextBlockIcon className="w-4 h-4" />
            <span>Compose</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              activeTab === 'templates' ? 'text-[#22C55E]' : 'text-[#8B949E]'
            }`}
          >
            <TemplateIcon className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              activeTab === 'preview' ? 'text-[#22C55E]' : 'text-[#8B949E]'
            }`}
          >
            <EyeIcon className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium tabular-nums ${
              activeTab === 'queue' ? 'text-[#22C55E]' : 'text-[#8B949E]'
            }`}
          >
            <QueueIcon className="w-4 h-4" />
            <span>{pendingQueueCount > 0 ? `Queue(${pendingQueueCount})` : 'Queue'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium tabular-nums ${
              activeTab === 'history' ? 'text-[#22C55E]' : 'text-[#8B949E]'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>
      </nav>

      <BluetoothModal
        open={bluetoothModalOpen}
        onClose={() => setBluetoothModalOpen(false)}
        bluetooth={bluetooth}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onConnect={handleConnectBluetooth}
        onDisconnect={handleDisconnectBluetooth}
        onTestPrint={handleTestFeed}
      />
    </div>
  );
}
