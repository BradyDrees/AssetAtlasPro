"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getPendingConnectionRequests,
  respondToConnectionRequest,
} from "@/app/actions/vendor-connection-responses";
import type { PendingConnectionRequest } from "@/app/actions/vendor-connection-responses";

interface PendingRequestsTabProps {
  initialRequests: PendingConnectionRequest[];
}

export function PendingRequestsTab({ initialRequests }: PendingRequestsTabProps) {
  const t = useTranslations("operate.vendors.pending");
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => {
    startTransition(async () => {
      const { data } = await getPendingConnectionRequests();
      setRequests(data);
    });
  };

  const handleAccept = (requestId: string) => {
    setActionId(requestId);
    startTransition(async () => {
      const result = await respondToConnectionRequest(requestId, true);
      setActionId(null);
      if (result.success) {
        setToast(t("accepted"));
        setTimeout(() => setToast(null), 3000);
        refresh();
      }
    });
  };

  const handleDecline = (requestId: string) => {
    setActionId(requestId);
    startTransition(async () => {
      const result = await respondToConnectionRequest(
        requestId,
        false,
        declineReason.trim() || undefined
      );
      setActionId(null);
      setDeclineId(null);
      setDeclineReason("");
      if (result.success) {
        setToast(t("declinedConfirm"));
        setTimeout(() => setToast(null), 3000);
        refresh();
      }
    });
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-surface-tertiary flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-content-secondary font-medium mb-1">{t("noRequests")}</h3>
        <p className="text-content-quaternary text-sm">{t("noRequestsHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {toast}
        </div>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          className="bg-surface-secondary border border-edge-primary rounded-xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            {/* PM info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">
                  {req.pm_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-content-primary font-medium truncate">
                  {req.pm_name}
                </p>
                {req.pm_email && (
                  <p className="text-content-quaternary text-xs truncate">
                    {req.pm_email}
                  </p>
                )}
                <p className="text-content-quaternary text-xs mt-0.5">
                  {t("sentOn", {
                    date: new Date(req.requested_at).toLocaleDateString(),
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            {declineId !== req.id && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(req.id)}
                  disabled={isPending && actionId === req.id}
                  className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isPending && actionId === req.id ? t("accepting") : t("accept")}
                </button>
                <button
                  onClick={() => setDeclineId(req.id)}
                  disabled={isPending && actionId === req.id}
                  className="px-3 py-1.5 rounded-lg border border-edge-primary text-content-secondary hover:bg-surface-tertiary disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {t("decline")}
                </button>
              </div>
            )}
          </div>

          {/* Message */}
          {req.request_message && (
            <div className="mt-3 p-3 rounded-lg bg-surface-tertiary">
              <p className="text-content-quaternary text-xs font-medium mb-1">{t("message")}</p>
              <p className="text-content-secondary text-sm">{req.request_message}</p>
            </div>
          )}

          {/* Decline reason input */}
          {declineId === req.id && (
            <div className="mt-3 p-3 rounded-lg border border-edge-secondary bg-surface-tertiary space-y-3">
              <div>
                <p className="text-content-secondary text-sm font-medium">{t("declineTitle")}</p>
                <p className="text-content-quaternary text-xs">{t("declineSubtitle")}</p>
              </div>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
                placeholder={t("declineReasonPlaceholder")}
                rows={2}
                className="w-full rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeclineId(null);
                    setDeclineReason("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-edge-primary text-content-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecline(req.id)}
                  disabled={isPending && actionId === req.id}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isPending && actionId === req.id ? t("declining") : t("confirmDecline")}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
