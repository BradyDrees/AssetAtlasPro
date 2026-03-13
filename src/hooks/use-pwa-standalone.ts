"use client";

import { useState, useEffect } from "react";

/**
 * Detects if the app is running as an installed PWA (standalone mode).
 * SSR-safe: returns false during server render.
 * Subscribes to media query changes for live updates.
 */
export function usePwaStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const iosStandalone = (navigator as unknown as Record<string, unknown>).standalone === true;

    setIsStandalone(mq.matches || iosStandalone);

    function onChange(e: MediaQueryListEvent) {
      setIsStandalone(e.matches || iosStandalone);
    }

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isStandalone;
}
