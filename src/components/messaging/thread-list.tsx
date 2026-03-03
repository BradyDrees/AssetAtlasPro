"use client";

import { useTranslations } from "next-intl";
import type { InboxThread } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

// ── Time formatting ──
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1d";
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface ThreadListProps {
  threads: InboxThread[];
  activeThreadId: string | null;
  filter: "all" | "unread" | "archived";
  onFilterChange: (f: "all" | "unread" | "archived") => void;
  onSelectThread: (id: string) => void;
  onArchive: (id: string) => void;
  onMute: (id: string, muted: boolean) => void;
  loading: boolean;
  product: Product;
  theme: (typeof productTheme)[Product];
  userId: string | undefined;
  /** Phase 3: Open new message flow */
  onNewMessage?: () => void;
  /** Phase 6: Open search */
  onSearch?: () => void;
}

export function ThreadList({
  threads,
  activeThreadId,
  filter,
  onFilterChange,
  onSelectThread,
  loading,
  product,
  theme,
  userId,
  onNewMessage,
  onSearch,
}: ThreadListProps) {
  const t = useTranslations("messaging");

  return (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-edge-primary">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-content-primary">
            {t("inbox.title")}
          </h1>
          <div className="flex items-center gap-1">
            {/* Search button */}
            {onSearch && (
              <button
                onClick={onSearch}
                className="p-2 text-content-tertiary hover:text-content-primary transition-colors rounded-lg hover:bg-surface-secondary"
                title={t("inbox.search")}
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            )}
            {/* New message button */}
            {onNewMessage && (
              <button
                onClick={onNewMessage}
                className={`p-2 rounded-lg transition-colors ${theme.accentText} hover:bg-surface-secondary`}
                title={t("inbox.newMessage")}
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
          {(["all", "unread", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                filter === f
                  ? `bg-surface-primary text-content-primary shadow-sm`
                  : "text-content-tertiary hover:text-content-secondary"
              }`}
            >
              {t(`inbox.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <p className="text-sm text-content-tertiary">{t("inbox.empty")}</p>
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isUnread = thread.unread_count > 0;

            // Other participants (not current user)
            const otherParticipants = (thread.participants ?? []).filter(
              (p) => p.user_id !== userId
            );
            const displayName =
              otherParticipants.length > 0
                ? otherParticipants
                    .map((p) => p.display_name || "Unknown")
                    .join(", ")
                : t("thread.you");
            const initial = (displayName[0] ?? "?").toUpperCase();

            // Thread type badge
            const typeBadge =
              thread.thread_type === "work_order"
                ? "WO"
                : thread.thread_type === "estimate"
                ? "EST"
                : thread.thread_type === "job"
                ? "JOB"
                : null;

            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left px-4 py-3 border-b border-edge-secondary transition-colors ${
                  isActive
                    ? `${theme.activeBg} ring-1 ring-inset ${theme.activeRing}`
                    : `hover:bg-surface-secondary`
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${theme.avatarBg} ${theme.avatarText}`}
                  >
                    {initial}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          isUnread
                            ? "font-semibold text-content-primary"
                            : "font-medium text-content-secondary"
                        }`}
                      >
                        {displayName}
                      </span>
                      <span className="text-xs text-content-quaternary flex-shrink-0">
                        {timeAgo(thread.last_message_at)}
                      </span>
                    </div>

                    {/* Thread context + preview */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {typeBadge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${theme.avatarBg} ${theme.avatarText}`}
                        >
                          {typeBadge}
                        </span>
                      )}
                      {thread.title && (
                        <span className="text-xs text-content-tertiary truncate">
                          {thread.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p
                        className={`text-xs truncate ${
                          isUnread
                            ? "text-content-secondary"
                            : "text-content-tertiary"
                        }`}
                      >
                        {thread.last_message_preview || "\u2026"}
                      </p>
                      {isUnread && (
                        <span
                          className={`ml-2 flex-shrink-0 w-5 h-5 rounded-full ${theme.badgeBg} text-white text-[10px] font-bold flex items-center justify-center`}
                        >
                          {thread.unread_count > 9
                            ? "9+"
                            : thread.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
