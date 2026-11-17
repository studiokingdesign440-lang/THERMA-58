import React, {useState} from 'react';
import type {PrintHistoryEntry} from '../types/printer';
import {DownloadIcon, HistoryIcon, PrinterIcon, TrashIcon} from './Icons';

interface PrintHistoryViewProps {
  entries: PrintHistoryEntry[];
  onReprint: (entry: PrintHistoryEntry) => void;
  onRestoreToEditor: (entry: PrintHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
  onReturnToEditor: () => void;
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({
  entries,
  onReprint,
  onRestoreToEditor,
  onDeleteEntry,
  onClearHistory,
  onReturnToEditor,
}) => {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'bluetooth' | 'exported'>('all');

  const filtered = entries.filter((entry) => {
    if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.deviceName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownloadBin = (entry: PrintHistoryEntry) => {
    const copy = new Uint8Array(entry.escPosData);
    const blob = new Blob([copy], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${(entry.title || 'history').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Print History Archive" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[4px] border border-[#232930] bg-[#111418] p-4">
        <div>
          <h1 className="text-base font-semibold text-[#E6EDF3]">Print History</h1>
          <p className="mt-0.5 text-xs text-[#8B949E] tabular-nums">
            {entries.length} archived prints & exports · Persisted offline in IndexedDB
          </p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#F87171] hover:text-[#F87171]"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Search & Filter */}
      {entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            aria-label="Search print history"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or printer..."
            className="flex-1 min-w-[200px] min-h-[40px] rounded-[4px] border border-[#232930] bg-[#111418] px-3 text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
          />

          <div
            role="group"
            aria-label="Filter history by source"
            className="flex items-center gap-1 rounded-[4px] border border-[#232930] bg-[#111418] p-1"
          >
            {(
              [
                ['all', 'All'],
                ['bluetooth', 'Bluetooth'],
                ['exported', 'Exported'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSourceFilter(key)}
                className={`min-h-[32px] px-3 text-xs font-medium rounded-[3px] transition-colors ${
                  sourceFilter === key
                    ? 'bg-[#E6EDF3] text-[#090B0D]'
                    : 'text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#30363D] bg-[#111418] p-10 text-center space-y-3">
          <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-[4px] border border-[#232930] bg-[#090B0D] text-[#8B949E]">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-[#E6EDF3]">No print history yet</h2>
          <p className="mx-auto max-w-md text-xs text-[#8B949E] leading-relaxed">
            Every receipt sent via Web Bluetooth or exported in Preview Mode is archived here for
            instant reprinting and reloading into the editor.
          </p>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E]"
          >
            Return to Composer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[4px] border border-[#232930] bg-[#111418] p-8 text-center">
          <p className="text-xs text-[#8B949E]">No history entries match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              data-testid="history-entry-item"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[4px] border border-[#232930] bg-[#111418] p-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {entry.previewDataUrl ? (
                  <img
                    src={entry.previewDataUrl}
                    alt={`Printed receipt ${entry.title}`}
                    className="w-16 h-20 object-cover object-top rounded-[2px] border border-[#30363D] bg-[#F6F6F2] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-20 flex items-center justify-center rounded-[2px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] shrink-0">
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-[#E6EDF3] truncate">
                    {entry.title || 'Untitled Receipt'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8B949E] tabular-nums">
                    <span>{new Date(entry.printedAt).toLocaleString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.paperLengthMm} mm</span>
                    <span aria-hidden="true">·</span>
                    <span>{(entry.payloadBytes / 1024).toFixed(1)} KB</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.outputMode === 'raster' ? 'Raster' : 'ESC/POS'}</span>
                  </div>
                  <p className="text-xs text-[#22C55E]">
                    {entry.source === 'bluetooth'
                      ? `Printed · ${entry.deviceName}`
                      : `Exported .bin · ${entry.deviceName}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {entry.blocksSnapshot && entry.blocksSnapshot.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRestoreToEditor(entry)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]"
                  >
                    Load to Editor
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadBin(entry)}
                  aria-label={`Download ESC/POS binary for ${entry.title}`}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  .bin
                </button>
                <button
                  type="button"
                  onClick={() => onReprint(entry)}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-[4px] border border-[#22C55E] bg-[#22C55E]/15 text-[#E6EDF3] hover:bg-[#22C55E]/25"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  Reprint
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label={`Delete history entry ${entry.title}`}
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
