import React from 'react';
import type {BluetoothPrinterState, PrintJob} from '../types/printer';
import {
  CheckIcon,
  DownloadIcon,
  PrinterIcon,
  QueueIcon,
  SyncIcon,
  TrashIcon,
} from './Icons';

interface PrintQueueViewProps {
  jobs: PrintJob[];
  bluetooth: BluetoothPrinterState;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncAll: () => void;
  onPrintJob: (job: PrintJob) => void;
  onDeleteJob: (id: string) => void;
  onClearCompleted: () => void;
  onReturnToEditor: () => void;
}

export const PrintQueueView: React.FC<PrintQueueViewProps> = ({
  jobs,
  bluetooth,
  isOnline,
  isSyncing,
  onSyncAll,
  onPrintJob,
  onDeleteJob,
  onClearCompleted,
  onReturnToEditor,
}) => {
  const pendingCount = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'failed',
  ).length;
  const completedCount = jobs.filter((j) => j.status === 'printed').length;

  const handleDownloadJobBin = (job: PrintJob) => {
    const copy = new Uint8Array(job.escPosData);
    const blob = new Blob([copy], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${(job.title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatus = (job: PrintJob) => {
    if (job.status === 'printed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22C55E]">
          <CheckIcon className="w-3.5 h-3.5" />
          Printed
        </span>
      );
    }
    if (job.status === 'printing') {
      return <span className="text-xs font-medium text-[#E6EDF3]">Printing...</span>;
    }
    if (job.status === 'failed') {
      return (
        <span className="text-xs font-medium text-[#F87171]">
          Failed · {job.errorMessage || 'Device error'}
        </span>
      );
    }
    return <span className="text-xs font-medium text-[#D97706]">Queued Offline</span>;
  };

  return (
    <section aria-label="Offline Print Queue and Sync" className="space-y-4">
      {/* Queue Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[4px] border border-[#232930] bg-[#111418] p-4">
        <div>
          <h1 className="text-base font-semibold text-[#E6EDF3]">
            Offline Print Queue & Sync
          </h1>
          <p className="mt-0.5 text-xs text-[#8B949E] tabular-nums">
            {isOnline ? 'Network online' : 'Offline mode'} · IndexedDB local persistence ·{' '}
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3]"
            >
              Clear Printed
            </button>
          )}
          <button
            type="button"
            disabled={pendingCount === 0 || isSyncing}
            onClick={onSyncAll}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] bg-[#22C55E] text-[#090B0D] hover:bg-[#16A34A] disabled:opacity-40 whitespace-nowrap"
          >
            <SyncIcon className="w-3.5 h-3.5" />
            {isSyncing
              ? 'Syncing...'
              : bluetooth.connected
                ? `Print Queued (${pendingCount})`
                : `Connect & Sync (${pendingCount})`}
          </button>
        </div>
      </div>

      {/* Jobs List or Empty State */}
      {jobs.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#30363D] bg-[#111418] p-10 text-center space-y-3">
          <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-[4px] border border-[#232930] bg-[#090B0D] text-[#8B949E]">
            <QueueIcon className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-[#E6EDF3]">No queued print jobs</h2>
          <p className="mx-auto max-w-md text-xs text-[#8B949E] leading-relaxed">
            Jobs saved while offline or disconnected are stored locally in IndexedDB and sync
            automatically when your 58mm Bluetooth printer reconnects.
          </p>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E]"
          >
            Return to Composer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              data-testid="print-queue-item"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[4px] border border-[#232930] bg-[#111418] p-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {job.previewDataUrl ? (
                  <img
                    src={job.previewDataUrl}
                    alt={`Preview of ${job.title}`}
                    className="w-16 h-20 object-cover object-top rounded-[2px] border border-[#30363D] bg-[#F6F6F2] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-20 flex items-center justify-center rounded-[2px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] shrink-0">
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-[#E6EDF3] truncate">
                    {job.title || 'Untitled Receipt'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8B949E] tabular-nums">
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{job.paperLengthMm} mm</span>
                    <span aria-hidden="true">·</span>
                    <span>{(job.payloadBytes / 1024).toFixed(1)} KB</span>
                    <span aria-hidden="true">·</span>
                    <span>{job.outputMode === 'raster' ? 'Raster' : 'ESC/POS'}</span>
                  </div>
                  <div className="pt-0.5">{renderStatus(job)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadJobBin(job)}
                  aria-label={`Download ESC/POS binary for ${job.title}`}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  .bin
                </button>
                <button
                  type="button"
                  onClick={() => onPrintJob(job)}
                  disabled={job.status === 'printing'}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-[4px] border border-[#22C55E] bg-[#22C55E]/15 text-[#E6EDF3] hover:bg-[#22C55E]/25 disabled:opacity-40"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  {job.status === 'printed' ? 'Reprint' : 'Print'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteJob(job.id)}
                  aria-label={`Remove ${job.title} from queue`}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-[4px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:border-[#F87171] hover:text-[#F87171]"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
