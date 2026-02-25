"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { sendHomeMessage } from "@/app/actions/home-messages";

interface ChatMessage {
  id: string;
  body: string;
  sender_id: string;
  sender_role: string;
  is_read: boolean;
  created_at: string;
}

interface ChatThreadContentProps {
  workOrderId: string;
  workOrder: {
    description: string | null;
    trade: string | null;
    status: string;
  };
  vendorName: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export function ChatThreadContent({
  workOrderId,
  workOrder,
  vendorName,
  initialMessages,
  currentUserId,
}: ChatThreadContentProps) {
  const t = useTranslations("home.messages");
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on mount and new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const body = newMessage.trim();
    if (!body) return;

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      body,
      sender_id: currentUserId,
      sender_role: "homeowner",
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    inputRef.current?.focus();

    startTransition(async () => {
      const result = await sendHomeMessage(workOrderId, body);
      if (!result.success) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setNewMessage(body); // Restore the message
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 space-y-3 pb-4">
        <Link
          href="/home/messages"
          className="text-sm text-content-quaternary hover:text-content-primary transition-colors"
        >
          {t("back")}
        </Link>

        {/* Vendor + WO info bar */}
        <div className="flex items-center justify-between bg-surface-primary rounded-xl border border-edge-primary p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-rose-400">{vendorName.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-content-primary truncate">{vendorName}</h2>
              <p className="text-xs text-content-quaternary truncate">
                {workOrder.trade && (
                  <span className="capitalize">{workOrder.trade} · </span>
                )}
                {workOrder.description?.slice(0, 50)}
                {(workOrder.description?.length ?? 0) > 50 ? "..." : ""}
              </p>
            </div>
          </div>
          <Link
            href={`/home/work-orders/${workOrderId}`}
            className="text-xs text-rose-500 hover:text-rose-400 font-medium flex-shrink-0"
          >
            {t("viewWorkOrder")}
          </Link>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-content-quaternary">{t("noMessages")}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-rose-600 text-white rounded-br-md"
                        : "bg-surface-primary border border-edge-primary text-content-primary rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMe ? "text-rose-200" : "text-content-quaternary"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-2 pb-2">
        <div className="flex items-center gap-2 bg-surface-primary border border-edge-primary rounded-xl p-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none px-2"
            disabled={isPending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isPending}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? t("sending") : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
