"use client";

import { useState } from "react";

interface ExpandableSectionProps {
  title: string;
  color: string;
  icon: string;
  statusLabel?: string;
  statusColor?: string;
  children: React.ReactNode;
}

export function ExpandableSection({
  title,
  color,
  icon,
  statusLabel,
  statusColor,
  children,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#0d1320] border border-slate-800 rounded-xl mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-bold text-[15px] flex items-center gap-2.5">
          <span>{icon}</span>
          <span style={{ color }}>{title}</span>
          {statusLabel && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
              style={{
                background: `${statusColor}26`,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          )}
        </span>
        <span
          className={`text-slate-500 transition-transform duration-200 text-base ${
            open ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-[13px] text-slate-400 leading-relaxed border-t border-slate-800 pt-4 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
