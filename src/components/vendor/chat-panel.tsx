"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  getChatMessages,
  sendChatMessage,
  sendPmChatMessage,
  markChatRead,
  type ChatMessage,
} from "@/app/actions/vendor-chat";

interface ChatPanelProps {
  workOrderId: string;
  currentUserId: string;
  /** "vendor" sends via sendChatMessage, "pm" sends via sendPmChatMessage */
  role: "vendor" | "pm";
}

export function ChatPanel({ workOrderId, currentUserId, role }: ChatPanelProps) {
  const t = useTranslations("vendor.jobs");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    const result = await getChatMessages(workOrderId);
    if (result.data) {
      setMessages(result.data);
      // Mark as read
      markChatRead(workOrderId);
    }
    setLoading(false);
  }, [workOrderId]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      getChatMessages(workOrderId).then((result) => {
        if (result.data && result.data.length !== messages.length) {
          setMessages(result.data);
          markChatRead(workOrderId);
        }
      });
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [workOrderId, messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    const result = role === "vendor"
      ? await sendChatMessage(workOrderId, body)
      : await sendPmChatMessage(workOrderId, body);

    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      setMessages((prev) => [...prev, { ...result.data!, sender_name: "You" }]);
      setInput("");
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-3 max-h-80"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-content-quaternary text-center py-4">
            {t("chat.noMessages")}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    isMe
                      ? "bg-brand-500 text-white"
                      : "bg-surface-secondary text-content-primary"
                  }`}
                >
                  {!isMe && msg.sender_name && (
                    <p className={`text-[10px] font-medium mb-0.5 ${
                      msg.sender_role === "pm" ? "text-purple-400" : "text-brand-400"
                    }`}>
                      {msg.sender_name}
                      <span className="ml-1 text-content-quaternary">
                        ({msg.sender_role === "pm" ? "PM" : t("chat.vendor")})
                      </span>
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.body}
                  </p>
                  <p className={`text-[10px] mt-1 ${
                    isMe ? "text-white/60" : "text-content-quaternary"
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-edge-secondary p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            className="flex-1 resize-none bg-surface-secondary border border-edge-secondary rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
