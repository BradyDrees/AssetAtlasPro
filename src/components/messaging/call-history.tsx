"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import { createClient } from "@/lib/supabase/client";
import { getCallHistory } from "@/app/actions/messaging";
import type { CallLog } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface CallHistoryProps {
  product: Product;
  /** Filter by a specific work order */
  workOrderId?: string | null;
  /** Filter by a specific contact */
  contactId?: string | null;
  onClose?: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallHistory({
  product,
  workOrderId,
  contactId,
  onClose,
}: CallHistoryProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];
  const { formatDateTime, formatDate: fmtDate } = useFormatDate();

  const formatCallDate = useCallback(
    (dateStr: string): string => {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const dayMs = 86400_000;

      if (diffMs < dayMs && d.getDate() === now.getDate()) {
        const hh = d.getHours();
        const mm = String(d.getMinutes()).padStart(2, "0");
        const ampm = hh >= 12 ? "PM" : "AM";
        return `${hh % 12 || 12}:${mm} ${ampm}`;
      }
      if (diffMs < dayMs * 7) {
        return formatDateTime(d);
      }
      return formatDateTime(d);
    },
    [formatDateTime]
  );

  const [userId, setUserId] = useState<string>();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setUserId(data.user.id);
      });
  }, []);

  const loadCalls = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      const result = await getCallHistory({
        limit: 25,
        cursor: cursor ?? null,
        work_order_id: workOrderId ?? null,
        contact_id: contactId ?? null,
      });
      if (!result.error) {
        if (cursor) {
          setCalls((prev) => [...prev, ...result.data]);
        } else {
          setCalls(result.data);
        }
        setHasMore(result.data.length === 25);
      }
      setLoading(false);
    },
    [workOrderId, contactId]
  );

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const loadMore = () => {
    const last = calls[calls.length - 1];
    if (last) loadCalls(last.started_at);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-primary flex-shrink-0">
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-content-tertiary hover:text-content-primary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-content-primary">
          {t("calls.title")}
        </h2>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading && calls.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <svg
              className="w-12 h-12 mb-3 text-content-quaternary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
            <p className="text-sm text-content-tertiary">{t("calls.empty")}</p>
          </div>
        ) : (
          <>
            {calls.map((call) => {
              const isOutbound = call.direction === "outbound";
              const isMissed =
                call.status === "no_answer" ||
                call.status === "busy" ||
                call.status === "canceled";
              const isVoicemail = call.status === "voicemail";
              const isOwn =
                userId && (call.caller_id === userId);

              return (
                <div
                  key={call.id}
                  className="px-4 py-3 border-b border-edge-secondary hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Direction icon */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isMissed
                          ? "bg-red-100 text-red-600"
                          : isVoicemail
                          ? "bg-amber-100 text-amber-600"
                          : `${theme.avatarBg} ${theme.avatarText}`
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                        />
                      </svg>
                    </div>

                    {/* Call info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-content-quaternary">
                          {isOutbound ? "↗" : "↙"}
                        </span>
                        <span
                          className={`text-sm ${
                            isMissed
                              ? "text-red-600 font-medium"
                              : "text-content-primary font-medium"
                          }`}
                        >
                          {isMissed
                            ? t("calls.missed")
                            : isVoicemail
                            ? t("calls.voicemail")
                            : isOutbound
                            ? t("calls.outgoing")
                            : t("calls.incoming")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {call.duration_seconds != null &&
                          call.duration_seconds > 0 && (
                            <span className="text-xs text-content-tertiary">
                              {formatDuration(call.duration_seconds)}
                            </span>
                          )}
                        {call.notes && (
                          <span className="text-xs text-content-quaternary">
                            📝
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs text-content-quaternary flex-shrink-0">
                      {formatCallDate(call.started_at)}
                    </span>
                  </div>

                  {/* Notes preview */}
                  {call.notes && (
                    <p className="mt-1.5 ml-12 text-xs text-content-tertiary truncate">
                      {call.notes}
                    </p>
                  )}

                  {/* Voicemail transcription */}
                  {call.voicemail_transcription && (
                    <p className="mt-1.5 ml-12 text-xs text-content-tertiary italic truncate">
                      🎤 {call.voicemail_transcription}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-center text-sm text-content-tertiary hover:text-content-primary"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("thread.loadMore")
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
