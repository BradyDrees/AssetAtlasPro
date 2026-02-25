"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ChatThread {
  work_order_id: string;
  vendor_org_id: string;
  vendor_name: string;
  wo_description: string | null;
  wo_trade: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_role: string;
  unread_count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export function MessagesListContent({ threads }: { threads: ChatThread[] }) {
  const t = useTranslations("home.messages");
  const [search, setSearch] = useState("");

  const filtered = threads.filter((thread) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      thread.vendor_name.toLowerCase().includes(q) ||
      (thread.wo_description ?? "").toLowerCase().includes(q) ||
      (thread.wo_trade ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
      </div>

      {/* Search */}
      {threads.length > 0 && (
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
      )}

      {/* Thread list */}
      {filtered.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-sm text-content-quaternary">{t("noThreads")}</p>
          <p className="text-xs text-content-quaternary mt-1">{t("noThreadsHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((thread) => (
            <Link
              key={thread.work_order_id}
              href={`/home/messages/${thread.work_order_id}`}
              className="flex items-start gap-3 bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-rose-500/30 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-rose-400">
                  {thread.vendor_name.charAt(0)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-content-primary truncate">
                    {thread.vendor_name}
                  </h3>
                  <span className="text-xs text-content-quaternary flex-shrink-0">
                    {timeAgo(thread.last_message_at)}
                  </span>
                </div>
                {thread.wo_trade && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-content-tertiary capitalize">
                    {thread.wo_trade}
                  </span>
                )}
                <p className="text-xs text-content-tertiary mt-1 truncate">
                  {thread.last_sender_role === "homeowner" ? `${t("you")}: ` : ""}
                  {thread.last_message}
                </p>
              </div>

              {/* Unread badge */}
              {thread.unread_count > 0 && (
                <div className="flex-shrink-0 mt-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {thread.unread_count}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
