"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface ColumnConfig {
  key: string;
  label: string;
  default: boolean;
}

interface ColumnFieldSelectorProps {
  storageKey: string;
  columns: ColumnConfig[];
  onColumnsChange: (visibleKeys: string[]) => void;
}

export function ColumnFieldSelector({
  storageKey,
  columns,
  onColumnsChange,
}: ColumnFieldSelectorProps) {
  const t = useTranslations("vendor.jobs");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set(columns.filter((c) => c.default).map((c) => c.key));
    }
    try {
      const saved = localStorage.getItem(`columns_${storageKey}`);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    } catch {
      // ignore
    }
    return new Set(columns.filter((c) => c.default).map((c) => c.key));
  });
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Persist and emit
  useEffect(() => {
    const keys = Array.from(visible);
    try {
      localStorage.setItem(`columns_${storageKey}`, JSON.stringify(keys));
    } catch {
      // ignore
    }
    onColumnsChange(keys);
  }, [visible, storageKey, onColumnsChange]);

  const toggle = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-secondary hover:text-content-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        {t("columns")}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-surface-primary border border-edge-primary rounded-xl shadow-xl p-2 space-y-1">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-secondary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => toggle(col.key)}
                className="rounded border-edge-primary text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-content-secondary">{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
