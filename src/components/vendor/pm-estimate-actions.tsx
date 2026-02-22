"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  approveEstimate,
  declineEstimate,
  requestEstimateChanges,
} from "@/app/actions/pm-estimates";

interface PmEstimateActionsProps {
  estimateId: string;
}

export function PmEstimateActions({ estimateId }: PmEstimateActionsProps) {
  const t = useTranslations("vendor.estimates");
  const router = useRouter();
  const [action, setAction] = useState<
    "idle" | "approve" | "decline" | "changes"
  >("idle");
  const [processing, setProcessing] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const result = await approveEstimate(estimateId);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      setAction("idle");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      const result = await declineEstimate(estimateId);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      setAction("idle");
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeNotes.trim()) return;
    setProcessing(true);
    try {
      const result = await requestEstimateChanges(estimateId, changeNotes.trim());
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      setAction("idle");
      setChangeNotes("");
    } finally {
      setProcessing(false);
    }
  };

  if (action === "idle") {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-primary mb-3">
          {t("pmActions")}
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setAction("approve")}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-1.5"
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
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            {t("approve")}
          </button>
          <button
            onClick={() => setAction("changes")}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors flex items-center gap-1.5"
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
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
              />
            </svg>
            {t("requestChanges")}
          </button>
          <button
            onClick={() => setAction("decline")}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center gap-1.5"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {t("decline")}
          </button>
        </div>
      </div>
    );
  }

  if (action === "approve") {
    return (
      <div className="bg-surface-primary rounded-xl border border-green-700/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-green-400">
          {t("confirmApproveTitle")}
        </h3>
        <p className="text-sm text-content-secondary">
          {t("confirmApproveMessage")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setAction("idle")}
            className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleApprove}
            disabled={processing}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            {processing ? t("processing") : t("confirmApprove")}
          </button>
        </div>
      </div>
    );
  }

  if (action === "decline") {
    return (
      <div className="bg-surface-primary rounded-xl border border-red-700/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-red-400">
          {t("confirmDeclineTitle")}
        </h3>
        <p className="text-sm text-content-secondary">
          {t("confirmDeclineMessage")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setAction("idle")}
            className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleDecline}
            disabled={processing}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {processing ? t("processing") : t("confirmDecline")}
          </button>
        </div>
      </div>
    );
  }

  // Request changes
  return (
    <div className="bg-surface-primary rounded-xl border border-amber-700/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-400">
        {t("requestChangesTitle")}
      </h3>
      <textarea
        value={changeNotes}
        onChange={(e) => setChangeNotes(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none placeholder:text-content-quaternary"
        placeholder={t("changeNotesPlaceholder")}
        autoFocus
      />
      <div className="flex gap-3">
        <button
          onClick={() => {
            setAction("idle");
            setChangeNotes("");
          }}
          className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleRequestChanges}
          disabled={processing || !changeNotes.trim()}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 transition-colors"
        >
          {processing ? t("processing") : t("sendChanges")}
        </button>
      </div>
    </div>
  );
}
