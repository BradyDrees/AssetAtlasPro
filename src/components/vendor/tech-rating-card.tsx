"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { rateTechPerformance, getTechRating } from "@/app/actions/vendor-tech-ratings";
import type { TechRating } from "@/app/actions/vendor-tech-ratings";

interface TechRatingCardProps {
  woId: string;
  techName: string;
  trade: string | null;
  canRate: boolean;
}

export function TechRatingCard({ woId, techName, trade, canRate }: TechRatingCardProps) {
  const t = useTranslations("vendor.jobs");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [existing, setExisting] = useState<TechRating | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load existing rating on mount
  useEffect(() => {
    async function load() {
      const res = await getTechRating(woId);
      if (res.data) {
        setExisting(res.data);
        setRating(res.data.rating);
        setNotes(res.data.notes || "");
      }
    }
    load();
  }, [woId]);

  const handleSubmit = () => {
    if (rating === 0) return;
    startTransition(async () => {
      const result = await rateTechPerformance({
        wo_id: woId,
        rating,
        notes: notes || undefined,
      });
      if (result.success) {
        setSubmitted(true);
        setEditing(false);
        setExisting({
          id: "",
          vendor_org_id: "",
          tech_user_id: "",
          wo_id: woId,
          trade: trade || "",
          rating,
          notes: notes || null,
          rated_by: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        // Clear submitted message after 3s
        setTimeout(() => setSubmitted(false), 3000);
      }
    });
  };

  // Already rated + not editing → show read-only state
  const showReadOnly = existing && !editing;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <h3 className="text-sm font-semibold text-content-primary mb-1">
        {t("techRating.title")}
      </h3>
      <p className="text-xs text-content-quaternary mb-3">
        {t("techRating.subtitle", { name: techName })}
      </p>

      {submitted && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium text-center">
          {t("techRating.submitted")}
        </div>
      )}

      {showReadOnly ? (
        /* ─── Read-only: show existing rating ─── */
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${star <= existing.rating ? "text-gold-400" : "text-charcoal-600"}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-content-primary font-medium">
              {existing.rating.toFixed(1)}
            </span>
          </div>
          {existing.notes && (
            <p className="text-xs text-content-tertiary">{existing.notes}</p>
          )}
          {canRate && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors"
            >
              {t("techRating.edit")}
            </button>
          )}
        </div>
      ) : canRate ? (
        /* ─── Interactive: star picker + notes ─── */
        <div className="space-y-3">
          {/* Star selector */}
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className={`text-2xl transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-gold-400"
                    : "text-charcoal-600 hover:text-charcoal-500"
                }`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            placeholder={t("techRating.notesPlaceholder")}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isPending}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-charcoal-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending
                ? t("techRating.submitting")
                : editing
                  ? t("techRating.update")
                  : t("techRating.submit")}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setRating(existing?.rating ?? 0);
                  setNotes(existing?.notes || "");
                }}
                className="px-4 py-2 bg-surface-secondary text-content-tertiary text-sm font-medium rounded-lg transition-colors hover:text-content-primary"
              >
                {t("time.cancel")}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─── Not authorized ─── */
        <p className="text-xs text-content-quaternary text-center py-2">
          {t("techRating.noPermission")}
        </p>
      )}
    </div>
  );
}
