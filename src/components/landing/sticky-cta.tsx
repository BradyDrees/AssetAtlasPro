"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#06090f]/95 backdrop-blur-xl border-t border-slate-800/50 md:hidden">
      <Link
        href="/signup"
        className="block text-center py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-600 to-green-500 text-black"
      >
        {t("auth.getStarted")} →
      </Link>
    </div>
  );
}
