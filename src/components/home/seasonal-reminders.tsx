"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { dismissReminder } from "@/app/actions/home-property";
import type { VisibleReminder } from "@/lib/home/seasonal-reminder-types";

interface Props {
  reminders: VisibleReminder[];
}

const SEASON_ICONS: Record<string, string> = {
  spring: "🌱",
  summer: "☀️",
  fall: "🍂",
  winter: "❄️",
};

export function SeasonalReminders({ reminders: initial }: Props) {
  const t = useTranslations("home.seasonal");
  const [reminders, setReminders] = useState(initial);
  const [isPending, startTransition] = useTransition();

  if (reminders.length === 0) return null;

  function handleDismiss(id: string, seasonYear: number) {
    startTransition(async () => {
      const result = await dismissReminder(id, seasonYear);
      if (result.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      }
    });
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <h2 className="text-sm font-semibold text-content-primary mb-3">
        {t("title")}
      </h2>
      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary"
          >
            <span className="text-lg flex-shrink-0 mt-0.5">
              {SEASON_ICONS[reminder.season] ?? "📋"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">
                {t(reminder.titleKey)}
              </p>
              <p className="text-xs text-content-tertiary mt-0.5">
                {t(reminder.descKey)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {reminder.trade && (
                  <Link
                    href={`/home/work-orders/new?trade=${encodeURIComponent(reminder.trade)}`}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-medium hover:bg-rose-500/20 transition-colors"
                  >
                    {t("createWo")}
                  </Link>
                )}
                <button
                  onClick={() => handleDismiss(reminder.id, reminder.seasonYear)}
                  disabled={isPending}
                  className="text-[10px] px-2.5 py-1 rounded-md text-content-quaternary hover:text-content-tertiary hover:bg-surface-tertiary transition-colors"
                >
                  {t("dismiss")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
