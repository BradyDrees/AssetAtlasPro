"use client";

import { fmt } from "@/lib/deal-analysis-calc";

interface DealCalcFieldProps {
  label: string;
  value: number;
  type?: "currency" | "pct" | "x" | "num";
  indent?: number;
  highlight?: boolean;
  bold?: boolean;
}

export function DealCalcField({
  label,
  value,
  type = "currency",
  indent = 0,
  highlight,
  bold,
}: DealCalcFieldProps) {
  return (
    <div
      className={`flex items-center py-1.5 border-b border-edge-tertiary gap-2 ${
        highlight ? "bg-brand-500/5" : ""
      }`}
      style={{ marginLeft: indent * 20 }}
    >
      <label
        className={`flex-1 text-xs leading-tight ${
          bold ? "text-content-primary font-semibold" : "text-content-tertiary"
        }`}
      >
        {label}
      </label>
      <span
        className={`w-36 md:w-40 text-right text-xs font-mono px-2.5 py-1.5 ${
          highlight
            ? "text-brand-400 font-semibold"
            : bold
            ? "text-content-primary font-semibold"
            : "text-content-secondary"
        }`}
      >
        {fmt(value, type)}
      </span>
    </div>
  );
}
