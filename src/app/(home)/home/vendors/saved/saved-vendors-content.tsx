"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface Pref {
  id: string;
  vendor_org_id: string;
  preference_type: string;
  trade: string | null;
  created_at: string;
}

interface VendorInfo {
  id: string;
  name: string;
  logo_url: string | null;
  trades: string[];
  avg_rating: number;
  total_ratings: number;
}

export function SavedVendorsContent({ prefs, vendors }: { prefs: Pref[]; vendors: VendorInfo[] }) {
  const t = useTranslations("home.vendors");

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/home/vendors" className="text-sm text-content-quaternary hover:text-content-primary transition-colors">
          &larr; {t("back")}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary mt-2">{t("savedVendors")}</h1>
      </div>

      {prefs.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-sm text-content-quaternary">{t("noSavedVendors")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prefs.map((pref) => {
            const vendor = vendorMap.get(pref.vendor_org_id);
            if (!vendor) return null;

            return (
              <Link
                key={pref.id}
                href={`/home/vendors/${vendor.id}`}
                className="flex items-center gap-4 bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-rose-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-sm font-bold text-rose-400">{vendor.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-content-primary truncate">{vendor.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-amber-400 text-xs">★</span>
                    <span className="text-xs text-content-primary">{vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : "—"}</span>
                    <span className="text-xs text-content-quaternary">({vendor.total_ratings})</span>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                  pref.preference_type === "preferred"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {pref.preference_type === "preferred" ? "★ Preferred" : "☆ Saved"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
