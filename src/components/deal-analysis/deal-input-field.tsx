"use client";

import { useState } from "react";
import { fmt } from "@/lib/deal-analysis-calc";

interface DealInputFieldProps {
  label: string;
  value: number | string;
  onChange: (val: number | string) => void;
  type?: "currency" | "pct" | "number" | "text";
  indent?: number;
  hint?: string;
  disabled?: boolean;
}

export function DealInputField({
  label,
  value,
  onChange,
  type = "currency",
  indent = 0,
  hint,
  disabled,
}: DealInputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const displayVal =
    type === "pct"
      ? ((value as number) * 100).toFixed(1)
      : type === "currency"
      ? fmt(value as number, "currency")
      : type === "number"
      ? fmt(value as number, "num")
      : (value as string);

  return (
    <div
      className="flex items-center py-1.5 border-b border-edge-tertiary gap-1.5 sm:gap-2"
      style={{ marginLeft: indent * 16 }}
    >
      <label className="flex-1 text-[11px] sm:text-xs text-content-tertiary leading-tight min-w-0">
        {label}
      </label>
      <div className="relative w-28 sm:w-36 md:w-40 shrink-0">
        <input
          disabled={disabled}
          className={`w-full px-2.5 py-1.5 text-xs font-mono text-right rounded border transition-all bg-surface-secondary text-content-primary ${
            focused
              ? "border-brand-500 ring-1 ring-brand-500/30"
              : "border-edge-secondary"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          value={focused ? raw : displayVal}
          onFocus={() => {
            setFocused(true);
            setRaw(
              type === "pct"
                ? ((value as number) * 100).toString()
                : String(value ?? "")
            );
          }}
          onBlur={() => {
            setFocused(false);
            if (type === "text") {
              onChange(raw);
              return;
            }
            const v = parseFloat(raw.replace(/[,$%]/g, ""));
            if (isNaN(v)) return;
            onChange(type === "pct" ? v / 100 : v);
          }}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {type === "pct" && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted text-[10px] pointer-events-none">
            %
          </span>
        )}
      </div>
      {hint && (
        <span className="text-[10px] text-content-muted w-16 hidden md:block">
          {hint}
        </span>
      )}
    </div>
  );
}
