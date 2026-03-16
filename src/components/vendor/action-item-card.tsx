"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ActionItem } from "@/lib/vendor/action-rules";

// ─── Priority indicator colors ──────────────────────────────────
const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-content-quaternary",
};

// ─── Category icons (inline SVGs for 14 rule types) ─────────────
function RuleIcon({ ruleKey, className }: { ruleKey: string; className?: string }) {
  const c = className ?? "w-4 h-4";
  switch (ruleKey) {
    case "respond_wo":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      );
    case "schedule_wo":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "todays_jobs":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.66-5.66a8 8 0 1111.31 0l-5.65 5.66z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l3 3" />
        </svg>
      );
    case "followup_completed":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      );
    case "send_estimate":
    case "followup_estimate":
    case "estimate_changes":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "create_invoice":
    case "submit_invoice":
    case "overdue_invoice":
    case "disputed_invoice":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      );
    case "unread_messages":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case "expiring_credential":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    default:
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

// ─── Time-ago display ───────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ─── Main Card ──────────────────────────────────────────────────

interface ActionItemCardProps {
  item: ActionItem;
  /** Compact = widget mode (no actions), full = page mode (with actions) */
  variant?: "compact" | "full";
  onComplete?: (taskKey: string, ruleKey: string) => void;
  onDismiss?: (taskKey: string, ruleKey: string) => void;
  onSnooze?: (taskKey: string, ruleKey: string, until: string) => void;
}

export function ActionItemCard({
  item,
  variant = "compact",
  onComplete,
  onDismiss,
  onSnooze,
}: ActionItemCardProps) {
  const t = useTranslations("vendor.actions");

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors group">
      {/* Priority dot + icon */}
      <div className="flex-shrink-0 relative mt-0.5">
        <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center text-content-tertiary">
          <RuleIcon ruleKey={item.ruleKey} />
        </div>
        <div
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[item.priority]} ring-2 ring-surface-primary`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link href={item.href} className="block">
          <p className="text-sm font-medium text-content-primary truncate">
            {t(item.titleKey, item.titleValues)}
          </p>
          <p className="text-xs text-content-tertiary truncate mt-0.5">
            {t(item.subtitleKey, item.titleValues)}
          </p>
        </Link>

        {/* Actions (full variant only) */}
        {variant === "full" && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.completable && onComplete && (
              <button
                onClick={() => onComplete(item.taskKey, item.ruleKey)}
                className="text-xs px-2 py-1 rounded bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 transition-colors"
              >
                {t("actions.markDone")}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(item.taskKey, item.ruleKey)}
                className="text-xs px-2 py-1 rounded bg-surface-tertiary text-content-tertiary hover:text-content-secondary transition-colors"
              >
                {t("actions.dismiss")}
              </button>
            )}
            {onSnooze && (
              <SnoozeDropdown
                onSnooze={(until) => onSnooze(item.taskKey, item.ruleKey, until)}
              />
            )}
          </div>
        )}
      </div>

      {/* Time ago */}
      <span className="text-xs text-content-quaternary flex-shrink-0 mt-1">
        {timeAgo(item.actionableAt)}
      </span>
    </div>
  );
}

// ─── Snooze Dropdown ────────────────────────────────────────────

function SnoozeDropdown({ onSnooze }: { onSnooze: (until: string) => void }) {
  const t = useTranslations("vendor.actions");
  const [open, setOpen] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  threeDays.setHours(9, 0, 0, 0);

  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  nextMonday.setHours(9, 0, 0, 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-2 py-1 rounded bg-surface-tertiary text-content-tertiary hover:text-content-secondary transition-colors"
      >
        {t("actions.snooze")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-surface-primary border border-edge-primary rounded-lg shadow-xl py-1 min-w-[140px]">
            {[
              { label: t("actions.snoozeTomorrow"), date: tomorrow },
              { label: t("actions.snooze3Days"), date: threeDays },
              { label: t("actions.snoozeNextMonday"), date: nextMonday },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  onSnooze(opt.date.toISOString());
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
