"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { rateWorkOrder } from "@/app/actions/home-work-orders";

interface WorkOrder {
  id: string;
  trade: string | null;
  description: string | null;
  status: string;
  urgency: string | null;
  vendor_org_id: string | null;
  vendor_selection_mode: string | null;
  created_at: string;
  completed_at: string | null;
  scheduled_date: string | null;
  property_name: string | null;
  property_address: string | null;
  completion_notes: string | null;
}

interface VendorOrgInfo {
  id: string;
  name: string;
  avg_rating: number;
  total_ratings: number;
  logo_url: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  matching: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  no_match: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  accepted: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  scheduled: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  invoiced: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  declined: "bg-red-500/20 text-red-400 border-red-500/30",
  on_hold: "bg-charcoal-500/20 text-charcoal-400 border-charcoal-500/30",
  done_pending_approval: "bg-lime-500/20 text-lime-400 border-lime-500/30",
};

const TIMELINE_STATUSES = ["assigned", "accepted", "scheduled", "in_progress", "completed"];

interface WoPhoto {
  id: string;
  storage_path: string;
  sort_order: number;
  url: string | null;
}

export function WorkOrderDetailContent({ workOrder, photos, vendorOrg }: { workOrder: WorkOrder; photos: WoPhoto[]; vendorOrg?: VendorOrgInfo | null }) {
  const t = useTranslations("home.workOrders");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentIdx = TIMELINE_STATUSES.indexOf(workOrder.status);
  const isCompleted = ["completed", "invoiced", "paid"].includes(workOrder.status);

  const handleRating = () => {
    if (rating === 0 || !workOrder.vendor_org_id) return;
    startTransition(async () => {
      const result = await rateWorkOrder({
        work_order_id: workOrder.id,
        vendor_org_id: workOrder.vendor_org_id!,
        rating,
        review: review || undefined,
      });
      if (result.success) {
        setRatingSubmitted(true);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/home/work-orders" className="text-sm text-content-quaternary hover:text-content-primary transition-colors">
          &larr; {t("title")}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-content-primary capitalize">{workOrder.trade ?? t("detail")}</h1>
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[workOrder.status] ?? "bg-charcoal-500/20 text-charcoal-400"}`}>
            {workOrder.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-content-quaternary">{t("trade")}</p>
            <p className="text-sm text-content-primary capitalize">{workOrder.trade ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("urgencyLabel")}</p>
            <p className="text-sm text-content-primary capitalize">{workOrder.urgency ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("createdAt")}</p>
            <p className="text-sm text-content-primary">{new Date(workOrder.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("vendor")}</p>
            <p className="text-sm text-content-primary">{vendorOrg ? vendorOrg.name : t("noVendorYet")}</p>
          </div>
        </div>
        {workOrder.description && (
          <div>
            <p className="text-xs text-content-quaternary mb-1">{t("description")}</p>
            <p className="text-sm text-content-secondary">{workOrder.description}</p>
          </div>
        )}
      </div>

      {/* Vendor Info Card */}
      {vendorOrg ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("vendor")}</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              {vendorOrg.logo_url ? (
                <img src={vendorOrg.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-lg font-bold text-rose-400">{vendorOrg.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-content-primary">{vendorOrg.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-amber-400 text-xs">★</span>
                <span className="text-xs text-content-primary font-medium">
                  {vendorOrg.avg_rating > 0 ? vendorOrg.avg_rating.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-content-quaternary">({vendorOrg.total_ratings})</span>
              </div>
            </div>
            <Link
              href={`/home/vendors/${vendorOrg.id}`}
              className="text-xs text-rose-500 hover:text-rose-400 font-medium"
            >
              {t("viewProfile")}
            </Link>
          </div>
        </div>
      ) : ["open", "no_match"].includes(workOrder.status) ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 text-center">
          <p className="text-sm text-content-tertiary mb-3">{t("noVendorYet")}</p>
          <Link
            href={`/home/vendors?wo=${workOrder.id}`}
            className="inline-block px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("browseVendors")}
          </Link>
        </div>
      ) : null}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("photos")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) =>
              photo.url ? (
                <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg border border-edge-secondary"
                  />
                </a>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("timeline")}</h2>
        <div className="relative">
          {TIMELINE_STATUSES.map((status, idx) => {
            const isPast = idx <= currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={status} className="flex items-start gap-3 relative">
                {/* Connector line */}
                {idx < TIMELINE_STATUSES.length - 1 && (
                  <div className={`absolute left-[9px] top-5 w-0.5 h-8 ${isPast ? "bg-rose-500" : "bg-surface-secondary"}`} />
                )}
                {/* Dot */}
                <div className={`w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  isCurrent
                    ? "bg-rose-500 ring-4 ring-rose-500/20"
                    : isPast
                      ? "bg-rose-500"
                      : "bg-surface-secondary border-2 border-edge-secondary"
                }`}>
                  {isPast && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                {/* Label */}
                <p className={`text-sm pb-6 ${isPast ? "text-content-primary font-medium" : "text-content-quaternary"}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimate (placeholder) */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("estimate")}</h2>
        <p className="text-sm text-content-quaternary text-center py-4">{t("paymentNote")}</p>
      </div>

      {/* Rating (show for completed WOs) */}
      {isCompleted && workOrder.vendor_org_id && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("rateVendor")}</h2>
          {ratingSubmitted ? (
            <p className="text-sm text-green-400 text-center py-4">{t("ratingSubmitted")}</p>
          ) : (
            <div className="space-y-4">
              {/* Stars */}
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-colors ${star <= rating ? "text-amber-400" : "text-charcoal-600 hover:text-charcoal-500"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                placeholder={t("writeReview")}
              />
              <button
                onClick={handleRating}
                disabled={rating === 0 || isPending}
                className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t("submitRating")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report Issue (show for completed WOs within warranty window) */}
      {isCompleted && (
        <Link
          href={`/home/work-orders/${workOrder.id}/dispute`}
          className="block text-center text-sm text-content-quaternary hover:text-rose-400 transition-colors py-2"
        >
          {t("reportIssue")}
        </Link>
      )}
    </div>
  );
}
