"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import { respondToReview } from "@/app/actions/vendor-reviews";
import type { OrgReview } from "@/app/actions/vendor-reviews";

interface Props {
  review: OrgReview;
}

export function VendorReviewCard({ review }: Props) {
  const t = useTranslations("vendor.reviews");
  const { formatDate } = useFormatDate();
  const [isEditing, setIsEditing] = useState(false);
  const [response, setResponse] = useState(review.vendor_response ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await respondToReview(review.id, response);
      if (result.error) {
        setError(result.error);
      } else {
        setIsEditing(false);
        // Optimistic: update local state
        review.vendor_response = response.replace(/<[^>]*>/g, "").trim() || null;
        review.vendor_responded_at = response.trim() ? new Date().toISOString() : null;
      }
    });
  };

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      {/* Stars + trade + date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-4 h-4 ${
                  s <= review.rating ? "text-yellow-400" : "text-content-quaternary/30"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.3-3.957z" />
              </svg>
            ))}
          </div>
          {review.trade && (
            <span className="text-xs text-content-quaternary bg-surface-tertiary px-2 py-0.5 rounded-full">
              {review.trade}
            </span>
          )}
        </div>
        <span className="text-xs text-content-quaternary">
          {formatDate(review.created_at, { weekday: false })}
        </span>
      </div>

      {/* Reviewer name */}
      {review.homeowner_name && (
        <p className="text-sm font-medium text-content-secondary mb-1">
          {review.homeowner_name}
        </p>
      )}

      {/* Review text */}
      {review.review && (
        <p className="text-sm text-content-tertiary mb-3">{review.review}</p>
      )}

      {/* Vendor response (read mode) */}
      {review.vendor_response && !isEditing && (
        <div className="mt-3 pl-4 border-l-2 border-brand-400/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-brand-400">
              {t("yourResponse")}
            </span>
            <button
              onClick={() => {
                setResponse(review.vendor_response ?? "");
                setIsEditing(true);
              }}
              className="text-xs text-content-quaternary hover:text-content-secondary transition-colors"
            >
              {t("edit")}
            </button>
          </div>
          <p className="text-sm text-content-tertiary">{review.vendor_response}</p>
          {review.vendor_responded_at && (
            <p className="text-xs text-content-quaternary mt-1">
              {formatDate(review.vendor_responded_at, { weekday: false })}
            </p>
          )}
        </div>
      )}

      {/* Respond / Edit form */}
      {!review.vendor_response && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          {t("respond")}
        </button>
      )}

      {isEditing && (
        <div className="mt-3 space-y-2">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={t("responsePlaceholder")}
            maxLength={500}
            rows={3}
            className="w-full bg-surface-secondary border border-edge-primary rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                response.length > 500
                  ? "text-red-400"
                  : "text-content-quaternary"
              }`}
            >
              {response.length}/{t("maxChars")}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setResponse(review.vendor_response ?? "");
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs text-content-tertiary hover:text-content-secondary transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || response.length > 500}
                className="px-4 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? t("submitting") : t("submitResponse")}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
