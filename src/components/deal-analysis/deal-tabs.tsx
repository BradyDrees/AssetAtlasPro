"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateDealAnalysis, deleteDealAnalysis } from "@/app/actions/deal-analysis";
import { calculateDeal } from "@/lib/deal-analysis-calc";
import type { DealAnalysis, DealData } from "@/lib/deal-analysis-types";
import { DEFAULT_DEAL_DATA } from "@/lib/deal-analysis-types";
import { TabDealInputs } from "./tab-deal-inputs";
import { TabQuickAnalysis } from "./tab-quick-analysis";
import { TabUnitMix } from "./tab-unit-mix";
import { TabIncomeExpenses } from "./tab-income-expenses";
import { TabRehab } from "./tab-rehab";
import { TabProForma } from "./tab-pro-forma";
import { TabReturnsExit } from "./tab-returns-exit";
import { TabScorecard } from "./tab-scorecard";
import { TabFlip } from "./tab-flip";

interface DealTabsProps {
  deal: DealAnalysis;
}

export type TabId =
  | "inputs"
  | "quick"
  | "unitMix"
  | "income"
  | "rehab"
  | "proforma"
  | "returns"
  | "scorecard"
  | "flip";

export function DealTabs({ deal }: DealTabsProps) {
  const t = useTranslations("dealAnalysis");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("inputs");
  const [d, setD] = useState<DealData>(() => ({
    ...DEFAULT_DEAL_DATA,
    ...(deal.data as Partial<DealData>),
  }));
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(d);
  dataRef.current = d;

  // ── Derived calculations ──
  const calc = useMemo(() => calculateDeal(d), [d]);

  // ── Field setters ──
  const set = useCallback(
    <K extends keyof DealData>(key: K, val: DealData[K]) =>
      setD((prev) => ({ ...prev, [key]: val })),
    []
  );

  const setArr = useCallback(
    <K extends keyof DealData>(
      key: K,
      idx: number,
      val: number
    ) =>
      setD((prev) => {
        const arr = [...(prev[key] as number[])];
        arr[idx] = val;
        return { ...prev, [key]: arr };
      }),
    []
  );

  // ── Auto-save (debounced 2s) ──
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateDealAnalysis(deal.id, { data: dataRef.current });
      } catch {
        // silent fail — user sees "saving..." briefly
      }
      setSaving(false);
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [d, deal.id]);

  // ── Delete handler ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDealAnalysis(deal.id);
      router.push("/deal-analysis");
    } catch {
      setDeleting(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "inputs", label: t("tabs.inputs"), icon: "◆" },
    { id: "quick", label: t("tabs.quick"), icon: "⚡" },
    { id: "unitMix", label: t("tabs.unitMix"), icon: "🏢" },
    { id: "income", label: t("tabs.income"), icon: "📊" },
    { id: "rehab", label: t("tabs.rehab"), icon: "🔨" },
    { id: "proforma", label: t("tabs.proforma"), icon: "📈" },
    { id: "returns", label: t("tabs.returns"), icon: "🎯" },
    { id: "scorecard", label: t("tabs.scorecard"), icon: "✓" },
    { id: "flip", label: t("tabs.flip"), icon: "🔄" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-content-primary">{deal.name}</h1>
          <p className="text-sm text-content-tertiary">
            {deal.property_name}
            {deal.address ? ` — ${deal.address}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-content-muted">{tCommon("saving")}</span>
          )}
          <button
            onClick={() => setShowDelete(true)}
            className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1"
          >
            {tCommon("delete")}
          </button>
        </div>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-edge-primary -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all ${
              tab === t.id
                ? "bg-brand-500/10 text-brand-400 border-b-2 border-brand-500"
                : "text-content-tertiary hover:text-content-primary hover:bg-surface-secondary"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Mini scorecard strip */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-surface-secondary rounded-lg border border-edge-primary overflow-x-auto">
        <span className="text-xs text-content-muted uppercase tracking-wider font-medium shrink-0">
          {t("quickScore")}
        </span>
        <span
          className={`text-lg font-bold ${
            calc.passCount >= 4
              ? "text-green-400"
              : calc.passCount >= 2
              ? "text-gold-400"
              : "text-red-400"
          }`}
        >
          {calc.passCount}/5
        </span>
        <div className="flex gap-2 ml-2">
          {calc.quickChecks.map((c) => (
            <span
              key={c.key}
              className={`w-2 h-2 rounded-full shrink-0 ${
                c.pass ? "bg-green-400" : "bg-red-400"
              }`}
              title={`${t(`checks.${c.key}`)} ${c.value}`}
            />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[50vh]">
        {tab === "inputs" && <TabDealInputs d={d} calc={calc} set={set} />}
        {tab === "quick" && <TabQuickAnalysis d={d} calc={calc} />}
        {tab === "unitMix" && <TabUnitMix d={d} set={set} calc={calc} />}
        {tab === "income" && <TabIncomeExpenses d={d} calc={calc} set={set} />}
        {tab === "rehab" && <TabRehab d={d} set={set} calc={calc} />}
        {tab === "proforma" && <TabProForma d={d} calc={calc} setArr={setArr} />}
        {tab === "returns" && <TabReturnsExit d={d} calc={calc} />}
        {tab === "scorecard" && <TabScorecard d={d} calc={calc} set={set} />}
        {tab === "flip" && <TabFlip d={d} calc={calc} set={set} />}
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-primary rounded-xl border border-edge-primary shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-content-primary mb-2">
              {t("deleteDeal")}
            </h2>
            <p className="text-sm text-content-tertiary mb-4">
              {t("deleteConfirm")}
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
              placeholder={deal.name}
              className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm mb-4 bg-surface-primary text-content-primary"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm("");
                }}
                className="px-4 py-2 text-sm text-content-tertiary"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== deal.name || deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md disabled:opacity-50"
              >
                {deleting ? t("deleting") : tCommon("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
