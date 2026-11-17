import React from 'react';
import type {BluetoothPrinterState, PrinterSettings} from '../types/printer';
import {BluetoothIcon, CloseIcon, PrinterIcon} from './Icons';

interface BluetoothModalProps {
  open: boolean;
  onClose: () => void;
  bluetooth: BluetoothPrinterState;
  settings: PrinterSettings;
  onUpdateSettings: (next: PrinterSettings) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestPrint: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  open,
  onClose,
  bluetooth,
  settings,
  onUpdateSettings,
  onConnect,
  onDisconnect,
  onTestPrint,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bluetooth-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-lg rounded-[4px] border border-[#30363D] bg-[#0F1216] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#232930] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BluetoothIcon className="w-4 h-4 text-[#E6EDF3]" />
            <h2 id="bluetooth-dialog-title" className="text-sm font-semibold text-[#E6EDF3]">
              58mm Web Bluetooth & Device Setup
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close printer setup dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[4px] text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3]"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 max-h-[80vh] overflow-y-auto">
          {/* Connection Card */}
          <div className="rounded-[4px] border border-[#232930] bg-[#111418] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#8B949E]">Device Status</p>
                <p className="mt-0.5 text-sm font-semibold text-[#E6EDF3]">
                  {bluetooth.connected
                    ? `Connected · ${bluetooth.deviceName || '58mm BLE Printer'}`
                    : bluetooth.connecting
                      ? 'Pairing via Web Bluetooth...'
                      : 'Disconnected'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bluetooth.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={onTestPrint}
                      className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3] whitespace-nowrap"
                    >
                      Test Feed
                    </button>
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-[4px] border border-[#DC2626]/60 bg-[#DC2626]/10 text-[#E6EDF3] hover:bg-[#DC2626]/20 whitespace-nowrap"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onConnect}
                    disabled={!bluetooth.supported || bluetooth.connecting}
                    className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] bg-[#22C55E] text-[#090B0D] hover:bg-[#16A34A] disabled:opacity-50 whitespace-nowrap"
                  >
                    <BluetoothIcon className="w-3.5 h-3.5" />
                    {bluetooth.connecting ? 'Scanning...' : 'Pair BLE Printer'}
                  </button>
                )}
              </div>
            </div>

            {!bluetooth.supported && (
              <p className="text-xs text-[#D97706] leading-relaxed">
                Web Bluetooth requires Chrome, Edge, or Opera on Desktop/Android over HTTPS (or
                localhost). You can still design receipts, preview 58mm output, and export raw
                ESC/POS binary payloads offline.
              </p>
            )}

            {bluetooth.lastError && (
              <p className="text-xs text-[#F87171] leading-relaxed border-t border-[#232930] pt-2">
                {bluetooth.lastError}
              </p>
            )}

            {bluetooth.connected && (
              <div className="border-t border-[#232930] pt-2.5 text-[11px] text-[#8B949E] space-y-1 tabular-nums">
                <p>Service UUID: {bluetooth.serviceUuid}</p>
                <p>Write Characteristic: {bluetooth.characteristicUuid}</p>
              </div>
            )}
          </div>

          {/* Hardware Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">58mm Output Parameters</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-[#8B949E]">Print Engine Mode</span>
                <select
                  value={settings.outputMode}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      outputMode: e.target.value as PrinterSettings['outputMode'],
                    })
                  }
                  className="w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#111418] px-3 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
                >
                  <option value="raster">Raster Bitmap (Exact Fonts, Italic & Images)</option>
                  <option value="escpos-text">ESC/POS Native Text (Fast ASCII)</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[#8B949E]">Feed Lines After Print</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={settings.feedLinesAfter}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      feedLinesAfter: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#111418] px-3 text-xs text-[#E6EDF3] tabular-nums focus:border-[#22C55E] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[#8B949E]">BLE Chunk Size (bytes)</span>
                <input
                  type="number"
                  min={20}
                  max={512}
                  step={10}
                  value={settings.chunkSizeBytes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      chunkSizeBytes: Math.max(20, Math.min(512, Number(e.target.value) || 100)),
                    })
                  }
                  className="w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#111418] px-3 text-xs text-[#E6EDF3] tabular-nums focus:border-[#22C55E] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[#8B949E]">Packet Pacing Delay (ms)</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.chunkDelayMs}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      chunkDelayMs: Math.max(5, Math.min(100, Number(e.target.value) || 18)),
                    })
                  }
                  className="w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#111418] px-3 text-xs text-[#E6EDF3] tabular-nums focus:border-[#22C55E] focus:outline-none"
                />
              </label>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between gap-3 rounded-[4px] border border-[#232930] bg-[#111418] px-3.5 py-2.5 cursor-pointer">
                <span className="text-xs text-[#E6EDF3]">Send auto-cut command (GS V)</span>
                <input
                  type="checkbox"
                  checked={settings.autoCut}
                  onChange={(e) =>
                    onUpdateSettings({...settings, autoCut: e.target.checked})
                  }
                  className="h-4 w-4 accent-[#22C55E]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-[4px] border border-[#232930] bg-[#111418] px-3.5 py-2.5 cursor-pointer">
                <span className="text-xs text-[#E6EDF3]">
                  Auto-sync queued jobs when printer reconnects
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoSyncOnReconnect}
                  onChange={(e) =>
                    onUpdateSettings({...settings, autoSyncOnReconnect: e.target.checked})
                  }
                  className="h-4 w-4 accent-[#22C55E]"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#232930] px-5 py-3">
          <span className="inline-flex items-center gap-2 text-xs text-[#8B949E] tabular-nums">
            <PrinterIcon className="w-3.5 h-3.5" />
            58mm · 384 dots @ 203 DPI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#E6EDF3]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
