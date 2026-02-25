"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ConversationPreview } from "@/lib/vendor/types";
import { getConversations, getTwilioStatus } from "@/app/actions/vendor-messages";
import { MessageThread } from "@/components/vendor/message-thread";
import { PhoneNumberManager } from "@/components/vendor/phone-number-manager";

export default function MessagesPage() {
  const t = useTranslations("vendor.messages");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [activeWoId, setActiveWoId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const loadConversations = useCallback(async () => {
    const [status, result] = await Promise.all([
      getTwilioStatus(),
      getConversations(),
    ]);
    setConfigured(status.configured);
    if (!result.error) setConversations(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Reload conversations when leaving a thread
  useEffect(() => {
    if (!activeWoId) {
      loadConversations();
    }
  }, [activeWoId, loadConversations]);

  const activeConvo = conversations.find((c) => c.work_order_id === activeWoId);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return t("justNow");
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="h-8 bg-surface-secondary rounded w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-surface-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Thread view (mobile takes full screen, desktop shows in same container)
  if (activeWoId) {
    return (
      <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
        <MessageThread
          workOrderId={activeWoId}
          tenantName={activeConvo?.tenant_name}
          tenantPhone={activeConvo?.tenant_phone}
          propertyName={activeConvo?.property_name}
          onBack={() => setActiveWoId(null)}
        />
      </div>
    );
  }

  // Settings view
  if (showSettings) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="text-content-tertiary hover:text-content-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-content-primary">{t("phoneSettings")}</h1>
        </div>
        <PhoneNumberManager />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-content-primary">{t("title")}</h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-2 text-content-tertiary hover:text-content-primary hover:bg-surface-secondary rounded-lg transition-colors"
          title={t("phoneSettings")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Not configured banner */}
      {!configured && (
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gold-400">{t("notConfiguredTitle")}</p>
              <p className="text-xs text-content-quaternary mt-0.5">{t("notConfiguredDesc")}</p>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="text-xs text-brand-500 hover:text-brand-400 font-medium mt-2"
              >
                {t("setupNumbers")} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations list */}
      {conversations.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-10 h-10 text-content-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <p className="text-sm text-content-tertiary">{t("noConversations")}</p>
          <p className="text-xs text-content-muted mt-1">{t("noConversationsHint")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((convo) => (
            <button
              key={convo.work_order_id}
              type="button"
              onClick={() => setActiveWoId(convo.work_order_id)}
              className="w-full flex items-center gap-3 p-3 bg-surface-primary rounded-xl border border-edge-primary hover:bg-surface-secondary transition-colors text-left"
            >
              {/* Avatar circle */}
              <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-brand-500">
                  {(convo.tenant_name || convo.tenant_phone || "?").charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-content-primary truncate">
                    {convo.tenant_name || convo.tenant_phone || t("unknownContact")}
                  </span>
                  <span className="text-[10px] text-content-muted flex-shrink-0">
                    {formatTime(convo.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-content-quaternary truncate">
                    {convo.property_name && (
                      <span className="text-content-tertiary">{convo.property_name} · </span>
                    )}
                    {convo.last_message || t("noMessages")}
                  </p>
                  {convo.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-brand-600 text-white flex-shrink-0">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
