"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface SearchResult {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  sender_id: string;
  thread_title: string | null;
}

interface MessageSearchProps {
  product: Product;
  onSelectResult: (threadId: string, messageId: string) => void;
  onClose: () => void;
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  // Simple case-insensitive highlight
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text;
}

function formatSearchDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MessageSearch({
  product,
  onSelectResult,
  onClose,
}: MessageSearchProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setResults([]);
          setLoading(false);
          return;
        }

        // Get thread IDs the user participates in
        const { data: participations } = await supabase
          .from("thread_participants")
          .select("thread_id")
          .eq("user_id", user.id);

        const threadIds = (participations ?? []).map((p) => p.thread_id);
        if (threadIds.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        // Search messages in those threads
        const { data: messages } = await supabase
          .from("messages")
          .select("id, thread_id, body, created_at, sender_id")
          .in("thread_id", threadIds)
          .ilike("body", `%${trimmed}%`)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!messages || messages.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        // Get thread titles for context
        const uniqueThreadIds = [...new Set(messages.map((m) => m.thread_id))];
        const { data: threads } = await supabase
          .from("message_threads")
          .select("id, title")
          .in("id", uniqueThreadIds);

        const titleMap = new Map<string, string | null>();
        for (const t of threads ?? []) {
          titleMap.set(t.id, t.title);
        }

        setResults(
          messages.map((m) => ({
            ...m,
            body: m.body || "",
            thread_title: titleMap.get(m.thread_id) ?? null,
          }))
        );
      } catch (err) {
        console.error("[message-search] Error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  const handleQueryChange = (value: string) => {
    setQuery(value);
    const timer = setTimeout(() => performSearch(value), 400);
    return () => clearTimeout(timer);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary md:relative md:inset-auto md:z-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-primary flex-shrink-0">
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Search input */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
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
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-content-tertiary"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-12 text-sm text-content-tertiary">
            {t("search.noResults")}
          </div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelectResult(result.thread_id, result.id)}
              className="w-full text-left px-4 py-3 border-b border-edge-secondary hover:bg-surface-secondary transition-colors"
            >
              {/* Thread context */}
              {result.thread_title && (
                <p className="text-[11px] text-content-quaternary mb-0.5 truncate">
                  {result.thread_title}
                </p>
              )}

              {/* Message body */}
              <p className="text-sm text-content-primary line-clamp-2">
                {result.body}
              </p>

              {/* Date */}
              <p className="text-[10px] text-content-quaternary mt-1">
                {formatSearchDate(result.created_at)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
