"use client";

import { useEffect } from "react";

/**
 * Invisible client component that scrolls to a group element on mount.
 * Used by server-rendered pages (like DD project page) to auto-scroll
 * when returning from a sub-page with ?group= in the URL.
 */
export function ScrollToGroup({ groupSlug }: { groupSlug: string }) {
  useEffect(() => {
    if (groupSlug) {
      const el = document.getElementById(`group-${groupSlug}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [groupSlug]);

  return null;
}
