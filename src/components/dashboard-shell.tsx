"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="flex h-dvh bg-surface-tertiary text-content-secondary">
        {children}
      </div>
    </div>
  );
}
