"use client";

import { useTranslations } from "next-intl";
import type { DomainEvent } from "@/lib/platform/domain-events";

interface WoTimelineSectionProps {
  events: DomainEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  "work_order.created": "\u2795",
  "work_order.status_changed": "\ud83d\udd04",
  "work_order.assigned": "\ud83d\udc64",
  "estimate.sent": "\ud83d\udce8",
  "estimate.approved": "\u2705",
  "invoice.submitted": "\ud83d\udcb0",
  "invoice.paid": "\ud83d\udcb3",
  "checklist.completed": "\u2611\ufe0f",
  "dispatch.created": "\ud83d\ude80",
};

export function WoTimelineSection({ events }: WoTimelineSectionProps) {
  const t = useTranslations("operate.workOrders");

  if (events.length === 0) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <p className="text-sm text-content-tertiary">{t("noActivity")}</p>
      </div>
    );
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("timeAgo.justNow");
    if (diffMins < 60) return t("timeAgo.minutes", { count: diffMins });
    if (diffHours < 24) return t("timeAgo.hours", { count: diffHours });
    if (diffDays < 7) return t("timeAgo.days", { count: diffDays });
    return d.toLocaleDateString();
  };

  const getEventLabel = (event: DomainEvent) => {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (event.event_type === "work_order.status_changed") {
      return t("eventStatusChanged", {
        from: String(payload.previous_status ?? "?"),
        to: String(payload.new_status ?? "?"),
      });
    }
    // Generic label from event type
    const key = event.event_type.replace(/\./g, "_");
    try {
      return t(`events.${key}`);
    } catch {
      return event.event_type.replace(/[._]/g, " ");
    }
  };

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-sm shrink-0">
              {EVENT_ICONS[event.event_type] || "\ud83d\udccc"}
            </div>
            {i < events.length - 1 && (
              <div className="w-px flex-1 bg-edge-secondary min-h-[24px]" />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 min-w-0 flex-1">
            <p className="text-sm text-content-primary font-medium leading-8">
              {getEventLabel(event)}
            </p>
            <p className="text-xs text-content-quaternary">
              {formatTimestamp(event.created_at)}
              {event.actor_type && event.actor_type !== "system" && (
                <span className="ml-1.5 text-content-quaternary">
                  {"\u00b7"} {event.actor_type}
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
