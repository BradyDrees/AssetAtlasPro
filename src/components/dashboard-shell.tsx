"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";
import { OfflineProvider } from "@/components/offline-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <OfflineProvider>
        <div className="flex h-dvh bg-surface-tertiary text-content-secondary">
          {children}
        </div>
      </OfflineProvider>
    </div>
  );
}
