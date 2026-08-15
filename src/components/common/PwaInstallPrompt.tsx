import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { isStandalonePwa, isIosDevice } from '../../utils/platform';

const DISMISS_KEY = 'sugarbaby_pwa_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // If running in standalone PWA, never show prompt
    if (isStandalonePwa()) {
      setIsInstalled(true);
      return;
    }

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
      setIsDismissed(false);
    }

    setIsIos(isIosDevice());

    // Chromium install prompt capture
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsDismissed(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide((prev) => !prev);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Dismiss for 7 days
    const nextPromptTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, nextPromptTime.toString());
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // Only render if we have a deferred prompt (Android/Chrome) or we are on iOS Safari
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-3.5 sm:p-4 shadow-xl shadow-indigo-950/30 mb-4 animate-fadeIn transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                Install SugarBaby on your phone
              </h4>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-normal">
              Instant offline logging, full-screen view, and home screen icon.
            </p>

            {/* iOS Step-by-Step Instructions Dropdown */}
            {isIos && showIosGuide && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs text-slate-300 animate-slideDown">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                    1
                  </div>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-indigo-400 mx-0.5" /> in Safari's bottom toolbar.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                    2
                  </div>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-400 mx-0.5" />.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIos ? (showIosGuide ? 'Hide' : 'How to Add') : 'Install'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
            title="Dismiss for 7 days"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Persistent card for Settings Modal
 */
export const PwaInstallSettingsCard: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsStandalone(isStandalonePwa());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowGuide((prev) => !prev);
    }
  };

  if (isStandalone) {
    return (
      <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>SugarBaby is installed and running in standalone mobile app mode.</span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Install SugarBaby (PWA)</div>
            <div className="text-[11px] text-slate-400">Add to Home Screen for fast offline logging</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstall}
          className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/30"
        >
          {deferredPrompt ? 'Install App' : showGuide ? 'Close Guide' : 'How to Install'}
        </button>
      </div>

      {showGuide && (
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1.5">
          <div className="font-semibold text-indigo-300">📱 iPhone / iPad (Safari):</div>
          <div>1. Tap <strong>Share</strong> <Share className="w-3 h-3 inline text-indigo-400" /> at bottom of Safari.</div>
          <div>2. Tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3 h-3 inline text-indigo-400" />.</div>

          <div className="font-semibold text-indigo-300 mt-2">🤖 Android / Chrome:</div>
          <div>1. Tap the menu <strong>(⋮)</strong> in Chrome.</div>
          <div>2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</div>
        </div>
      )}
    </div>
  );
};
