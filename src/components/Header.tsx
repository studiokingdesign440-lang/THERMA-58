import React from 'react';
import type {BluetoothPrinterState, WorkspaceTab} from '../types/printer';
import {BluetoothIcon, PrinterIcon} from './Icons';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  queuedCount: number;
  historyCount: number;
  bluetooth: BluetoothPrinterState;
  onOpenBluetooth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  queuedCount,
  historyCount,
  bluetooth,
  onOpenBluetooth,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#232930] bg-[#090B0D]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('compose')}
          className="flex items-center gap-2.5 text-left text-base font-bold tracking-tight text-[#E6EDF3] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
        >
          <PrinterIcon className="w-5 h-5 text-[#E6EDF3]" />
          <span>Therma 58</span>
        </button>

        {/* Zone 2: Concise Single-Line Navigation Links (5 links) */}
        <nav aria-label="Primary workspace navigation" className="hidden md:flex items-center gap-5">
          <button
            type="button"
            onClick={() => onSelectTab('compose')}
            className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'compose'
                ? 'border-[#22C55E] text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Compose
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('templates')}
            className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'templates'
                ? 'border-[#22C55E] text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('preview')}
            className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'preview'
                ? 'border-[#22C55E] text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Preview Mode
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('queue')}
            className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 tabular-nums ${
              activeTab === 'queue'
                ? 'border-[#22C55E] text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            {queuedCount > 0 ? `Queue · ${queuedCount}` : 'Queue'}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 tabular-nums ${
              activeTab === 'history'
                ? 'border-[#22C55E] text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            {historyCount > 0 ? `History · ${historyCount}` : 'History'}
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenBluetooth}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] ${
              bluetooth.connected
                ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#E6EDF3] hover:bg-[#22C55E]/25'
                : 'border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]'
            }`}
          >
            <BluetoothIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">
              {bluetooth.connected
                ? bluetooth.deviceName || 'Printer Connected'
                : 'Connect Printer'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
