"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";

/**
 * Home shell — mirrors DashboardShell / VendorShell.
 * Wraps homeowner pages with dark mode class.
 */
export function HomeShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="flex h-dvh bg-surface-tertiary text-content-secondary">
        {children}
      </div>
    </div>
  );
}
