"use client";

import { useState, useEffect } from "react";

/**
 * Detects if the device is a mobile/tablet that supports camera capture.
 * Uses `pointer: coarse` (avoids false positives on laptops with touchscreens)
 * combined with viewport width < 1024px.
 *
 * SSR-safe: returns false during server render.
 * Subscribes to media query changes for live updates (e.g. device rotation,
 * connecting external mouse, etc.).
 */
export function useMobileCapture(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const pointerMq = window.matchMedia("(pointer: coarse)");

    function evaluate() {
      setIsMobile(pointerMq.matches && window.innerWidth < 1024);
    }

    evaluate();

    // Re-evaluate when pointer capability or window size changes
    pointerMq.addEventListener("change", evaluate);
    window.addEventListener("resize", evaluate);

    return () => {
      pointerMq.removeEventListener("change", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  return isMobile;
}
