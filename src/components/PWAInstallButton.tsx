import React, {useState} from 'react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';
import {usePWAInstall} from '../hooks/usePWAInstall';
import {CloseIcon, DownloadIcon, OfflineIcon} from './Icons';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-[4px] border border-[#22C55E]/60 bg-[#22C55E]/10 text-[#E6EDF3] hover:bg-[#22C55E]/20 transition-colors whitespace-nowrap shrink-0"
      >
        <DownloadIcon className="w-3.5 h-3.5 text-[#22C55E]" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#111418] text-[#E6EDF3] hover:border-[#8B949E] transition-colors whitespace-nowrap shrink-0"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          >
            <div className="w-full max-w-sm rounded-[4px] border border-[#30363D] bg-[#111418] p-5">
              <div className="flex items-center justify-between border-b border-[#232930] pb-3">
                <h3 id="ios-install-title" className="text-sm font-semibold text-[#E6EDF3]">
                  Install Therma 58 on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="p-1.5 text-[#8B949E] hover:text-[#E6EDF3]"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-[#8B949E]">
                <li>1. Tap the Share icon in the Safari toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Launch Therma 58 offline from your home screen.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#161B22] py-2 text-xs font-semibold text-[#E6EDF3] hover:border-[#E6EDF3]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-[4px] border border-[#D97706]/50 bg-[#D97706]/10 px-3 py-1.5 text-xs text-[#E6EDF3]"
    >
      <OfflineIcon className="w-3.5 h-3.5 text-[#D97706]" />
      <span>Offline Mode · Drafts and print queue synced locally</span>
    </div>
  );
};
