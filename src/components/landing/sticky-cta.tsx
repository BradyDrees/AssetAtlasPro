"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Self-contained i18n — this component lives in the root layout which has no
// NextIntlClientProvider, so we read lang from <html> (same pattern as PwaInstallPrompt).
const TEXT = {
  en: { getStarted: "Get Started" },
  es: { getStarted: "Comenzar" },
} as const;

function getLocale(): "en" | "es" {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang === "es") return "es";
  }
  return "en";
}

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState<"en" | "es">("en");

  useEffect(() => {
    setLocale(getLocale());
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  const t = TEXT[locale];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#06090f]/95 backdrop-blur-xl border-t border-slate-800/50 md:hidden">
      <Link
        href="/signup"
        className="block text-center py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-600 to-green-500 text-black"
      >
        {t.getStarted} →
      </Link>
    </div>
  );
}
