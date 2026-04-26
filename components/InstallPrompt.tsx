import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'khetismart_install_dismissed_at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS
  // @ts-ignore - Safari-specific
  if (window.navigator.standalone === true) return true;
  // Android / desktop Chrome
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Already installed — never show
    if (isStandalone()) return;

    // Recently dismissed — respect the user
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_TTL_MS) return;
    } catch { /* ignore */ }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari never fires beforeinstallprompt — show the manual instructions
    if (isIOS()) {
      const t = setTimeout(() => {
        setShowIosHint(true);
        setHidden(false);
      }, 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setHidden(true);
      setDeferredPrompt(null);
    } else {
      dismiss();
    }
  };

  if (hidden) return null;

  // iOS hint card (manual "Add to Home Screen")
  if (showIosHint && !deferredPrompt) {
    return (
      <div className="fixed left-3 right-3 bottom-24 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800/50 p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-full shrink-0">
            <Smartphone size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Install KhetiSmart</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-snug">
              Tap the <strong>Share</strong> icon below, then choose <strong>"Add to Home Screen"</strong> to use KhetiSmart like an app.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Android / desktop install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed left-3 right-3 bottom-24 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800/50 p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2.5 rounded-full shrink-0">
            <Download size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Install KhetiSmart</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
              Add to your home screen for offline access and a faster, app-like experience.
            </p>
          </div>
          <button
            onClick={install}
            className="bg-primary text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-emerald-600 transition shrink-0"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;
