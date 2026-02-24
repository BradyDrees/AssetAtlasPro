"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  getEstimateComments,
  addEstimateComment,
  type EstimateComment,
} from "@/app/actions/vendor-estimate-comments";

interface EstimateCommentThreadProps {
  estimateId: string;
  currentUserId?: string;
  /** "vendor" or "pm" — determines which add action to call */
  role?: "vendor" | "pm";
}

export function EstimateCommentThread({
  estimateId,
  currentUserId,
  role = "vendor",
}: EstimateCommentThreadProps) {
  const t = useTranslations("vendor.estimates");
  const [comments, setComments] = useState<EstimateComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    const result = await getEstimateComments(estimateId);
    setComments(result.data);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    const result = await addEstimateComment(estimateId, newComment);
    if (!result.error && result.data) {
      setComments((prev) => [...prev, result.data!]);
      setNewComment("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-3 max-h-[20rem]">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-content-quaternary py-6">
            {t("comments.noComments")}
          </p>
        ) : (
          comments.map((c) => {
            const isMe = c.author_id === currentUserId;
            const isVendor = c.author_role === "vendor";
            return (
              <div
                key={c.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    isVendor
                      ? "bg-brand-600/20 text-content-primary"
                      : "bg-surface-secondary text-content-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium uppercase ${
                      isVendor ? "text-brand-400" : "text-blue-400"
                    }`}>
                      {isVendor ? t("comments.vendor") : t("comments.pm")}
                    </span>
                    <span className="text-[10px] text-content-quaternary">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-edge-secondary p-3">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("comments.placeholder")}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newComment.trim() || sending}
            className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
