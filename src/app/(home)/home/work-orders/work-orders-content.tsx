"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface WorkOrder {
  id: string;
  trade: string | null;
  description: string | null;
  status: string;
  urgency: string | null;
  created_at: string;
  property_name: string | null;
}

interface WorkOrdersContentProps {
  workOrders: WorkOrder[];
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-charcoal-500/20 text-charcoal-400",
  matching: "bg-purple-500/20 text-purple-400",
  assigned: "bg-blue-500/20 text-blue-400",
  accepted: "bg-cyan-500/20 text-cyan-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  en_route: "bg-indigo-500/20 text-indigo-400",
  on_site: "bg-indigo-500/20 text-indigo-400",
  in_progress: "bg-amber-500/20 text-amber-400",
  completed: "bg-green-500/20 text-green-400",
  done_pending_approval: "bg-green-500/20 text-green-400",
  invoiced: "bg-emerald-500/20 text-emerald-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  on_hold: "bg-charcoal-500/20 text-charcoal-400",
};

const URGENCY_STYLES: Record<string, string> = {
  emergency: "bg-red-600/20 text-red-400 border border-red-500/30 font-semibold",
  urgent: "bg-red-500/20 text-red-400",
  routine: "bg-blue-500/20 text-blue-400",
  whenever: "bg-charcoal-500/20 text-charcoal-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkOrdersContent({ workOrders }: WorkOrdersContentProps) {
  const t = useTranslations("home.workOrders");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");

  const COMPLETED_STATUSES = ["completed", "paid", "declined"];

  const activeOrders = workOrders.filter((wo) => !COMPLETED_STATUSES.includes(wo.status));
  const historyOrders = workOrders.filter((wo) => COMPLETED_STATUSES.includes(wo.status));
  const baseOrders = tab === "active" ? activeOrders : historyOrders;

  // Collect unique trades for filter
  const allTrades = useMemo(() => {
    const trades = new Set(workOrders.map((wo) => wo.trade).filter(Boolean) as string[]);
    return Array.from(trades).sort();
  }, [workOrders]);

  // Apply search + trade filter
  const displayedOrders = useMemo(() => {
    return baseOrders.filter((wo) => {
      if (search) {
        const q = search.toLowerCase();
        const matchTrade = wo.trade?.toLowerCase().includes(q);
        const matchDesc = wo.description?.toLowerCase().includes(q);
        if (!matchTrade && !matchDesc) return false;
      }
      if (tradeFilter && wo.trade !== tradeFilter) return false;
      return true;
    });
  }, [baseOrders, search, tradeFilter]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
          <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/home/work-orders/new"
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("newWorkOrder")}
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
        {allTrades.length > 1 && (
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="px-3 py-2 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm"
          >
            <option value="">{t("allTrades")}</option>
            {allTrades.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "active" ? "bg-surface-primary text-content-primary shadow-sm" : "text-content-tertiary hover:text-content-primary"
          }`}
        >
          {t("active")} ({activeOrders.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "history" ? "bg-surface-primary text-content-primary shadow-sm" : "text-content-tertiary hover:text-content-primary"
          }`}
        >
          {t("history")} ({historyOrders.length})
        </button>
      </div>

      {/* Work order list */}
      {displayedOrders.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-content-quaternary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
          </svg>
          <p className="text-sm text-content-quaternary">
            {tab === "active" ? t("noActiveOrders") : t("noHistory")}
          </p>
          {tab === "active" && (
            <Link href="/home/work-orders/new" className="inline-block mt-3 text-sm text-rose-500 hover:text-rose-400 font-medium">
              {t("newWorkOrder")} →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((wo) => (
            <Link
              key={wo.id}
              href={`/home/work-orders/${wo.id}`}
              className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-rose-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-content-primary capitalize">
                      {wo.trade ?? t("other")}
                    </span>
                    {wo.urgency && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${URGENCY_STYLES[wo.urgency] ?? ""}`}>
                        {wo.urgency === "urgent" || wo.urgency === "emergency" ? "● " : ""}
                        {t(wo.urgency as "emergency" | "urgent" | "routine" | "whenever")}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[wo.status] ?? "bg-charcoal-500/20 text-charcoal-400"}`}>
                      {wo.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-content-tertiary line-clamp-2">{wo.description}</p>
                  <p className="text-xs text-content-quaternary mt-2">
                    {formatDate(wo.created_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
