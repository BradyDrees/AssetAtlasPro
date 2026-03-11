"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Self-contained i18n — reads lang from <html> so it works outside NextIntlClientProvider
const TEXT = {
  en: {
    title: "Install Asset Atlas",
    body: "Add to your home screen for the best experience — faster loads, offline access, and push notifications.",
    install: "Install App",
    notNow: "Not now",
  },
  es: {
    title: "Instalar Asset Atlas",
    body: "Agrega a tu pantalla de inicio para una mejor experiencia — cargas rápidas, acceso sin conexión y notificaciones.",
    install: "Instalar App",
    notNow: "Ahora no",
  },
} as const;

function getLocale(): "en" | "es" {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang === "es") return "es";
  }
  return "en";
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [locale, setLocale] = useState<"en" | "es">("en");

  useEffect(() => {
    setLocale(getLocale());

    // Check if already installed / in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as Record<string, unknown>).standalone) {
      setIsStandalone(true);
      return;
    }

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const t = TEXT[locale];

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setDeferredPrompt(null);
  };

  // Don't show if: already installed, no prompt available, or user dismissed
  if (isStandalone || !deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 z-50 md:hidden">
      <div className="bg-surface-primary border border-edge-primary rounded-2xl shadow-xl p-4 flex items-start gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content-primary">{t.title}</p>
          <p className="text-xs text-content-tertiary mt-0.5">{t.body}</p>

          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors min-h-[36px]"
            >
              {t.install}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-xs text-content-quaternary hover:text-content-tertiary transition-colors min-h-[36px]"
            >
              {t.notNow}
            </button>
          </div>
        </div>

        {/* Close X */}
        <button
          onClick={handleDismiss}
          className="p-1.5 text-content-quaternary hover:text-content-tertiary flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
