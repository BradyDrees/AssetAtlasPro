"use client";

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  OperateUnit,
  UnitStatus,
  UnitType,
  CostLedgerEntry,
  CostCategory,
  UnitInspection,
  InspectionType,
  UnitDocument,
  DocumentType,
  UpdateUnitInput,
} from "@/app/actions/operate-units";
import {
  updateOperateUnit,
  getUnitCostLedger,
  addCostLedgerEntry,
  getUnitWorkOrders,
  getUnitInspections,
  createUnitInspection,
  getUnitDocuments,
  uploadUnitDocument,
  deleteUnitDocument,
} from "@/app/actions/operate-units";
import {
  useFieldConfig,
  getFieldsBySection,
  type FieldConfig,
} from "@/hooks/use-field-config";

// -----------------------------------------------
// Types
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;
type TabKey = "overview" | "costLedger" | "workOrders" | "inspections" | "documents";

interface UnitDetailShellProps {
  unit: OperateUnit;
  messages: Record<string, unknown>;
}

// -----------------------------------------------
// Deep-access i18n helper (matches projects-board pattern)
// -----------------------------------------------
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function createT(messages: Record<string, unknown>): TFn {
  return (key: string, values?: Record<string, string | number>) => {
    let str = getNestedValue(messages, key);
    if (!str) return key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        str = str!.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str!;
  };
}

// -----------------------------------------------
// Badge colour maps
// -----------------------------------------------
const STATUS_BADGE: Record<UnitStatus, string> = {
  occupied: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  vacant: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  turn_in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ready_to_lease: "bg-green-500/15 text-green-400 border-green-500/30",
};

const TYPE_BADGE: Record<UnitType, string> = {
  studio: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "1br": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "2br": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "3br": "bg-green-500/15 text-green-400 border-green-500/30",
  "4br": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  other: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
};

const COST_CATEGORY_BADGE: Record<string, string> = {
  general: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
  plumbing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  electrical: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  hvac: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  appliance: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  paint: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  flooring: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cleaning: "bg-green-500/15 text-green-400 border-green-500/30",
  pest_control: "bg-red-500/15 text-red-400 border-red-500/30",
  landscaping: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  roofing: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  turn: "bg-green-500/15 text-green-400 border-green-500/30",
  capital: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  other: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
};

const SOURCE_BADGE: Record<string, string> = {
  manual: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
  work_order: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  turn: "bg-green-500/15 text-green-400 border-green-500/30",
};

const INSPECTION_TYPE_BADGE: Record<InspectionType, string> = {
  move_in: "bg-green-500/15 text-green-400 border-green-500/30",
  move_out: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  routine: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  annual: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const DOC_TYPE_BADGE: Record<DocumentType, string> = {
  lease: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  warranty: "bg-green-500/15 text-green-400 border-green-500/30",
  permit: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  invoice: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
};

const TABS: TabKey[] = ["overview", "costLedger", "workOrders", "inspections", "documents"];

const COST_CATEGORIES: CostCategory[] = [
  "general",
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "paint",
  "flooring",
  "cleaning",
  "pest_control",
  "landscaping",
  "roofing",
  "turn",
  "capital",
  "other",
];

// -----------------------------------------------
// Helpers
// -----------------------------------------------
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString();
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// -----------------------------------------------
// Main shell
// -----------------------------------------------
export function UnitDetailShell({ unit, messages }: UnitDetailShellProps) {
  const t = useMemo(() => createT(messages), [messages]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [localUnit, setLocalUnit] = useState<OperateUnit>(unit);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/operate/units"
        className="inline-flex items-center gap-1.5 text-sm text-content-tertiary hover:text-content-primary transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("detail.backToUnits")}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-content-primary">
            {localUnit.unit_number}
            <span className="text-content-tertiary font-normal"> &mdash; {localUnit.property_name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_BADGE[localUnit.status]}`}
          >
            {t(`statuses.${localUnit.status}`)}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[localUnit.unit_type]}`}
          >
            {t(`unitTypes.${localUnit.unit_type}`)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-surface-secondary p-1 border border-edge-secondary overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-green-600 text-white shadow-sm"
                : "text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab unit={localUnit} setUnit={setLocalUnit} t={t} />
        )}
        {activeTab === "costLedger" && (
          <CostLedgerTab unit={localUnit} t={t} />
        )}
        {activeTab === "workOrders" && (
          <WorkOrdersTab unit={localUnit} t={t} />
        )}
        {activeTab === "inspections" && (
          <InspectionsTab unit={localUnit} t={t} />
        )}
        {activeTab === "documents" && (
          <DocumentsTab unit={localUnit} t={t} />
        )}
      </div>
    </div>
  );
}

// ===============================================
// TAB 1 -- Overview
// ===============================================
function OverviewTab({
  unit,
  setUnit,
  t,
}: {
  unit: OperateUnit;
  setUnit: React.Dispatch<React.SetStateAction<OperateUnit>>;
  t: TFn;
}) {
  const fields = useFieldConfig("unit");
  const sections = useMemo(() => getFieldsBySection(fields), [fields]);
  const [isPending, startTransition] = useTransition();

  const sectionLabels: Record<string, string> = {
    unitInfo: t("overview.unitInfo"),
    tenantInfo: t("overview.tenantInfo"),
    leaseInfo: t("overview.leaseInfo"),
  };

  const handleFieldSave = useCallback(
    async (key: string, value: string | number | null) => {
      const updates: UpdateUnitInput = { [key]: value };
      const result = await updateOperateUnit(unit.id, updates);
      if (result.success) {
        setUnit((prev) => ({ ...prev, [key]: value, updated_at: new Date().toISOString() }));
      }
    },
    [unit.id, setUnit]
  );

  return (
    <div className="space-y-6">
      {Object.entries(sections).map(([sectionKey, sectionFields]) => (
        <div
          key={sectionKey}
          className="rounded-xl border border-edge-secondary bg-surface-secondary p-5"
        >
          <h3 className="text-sm font-semibold text-content-primary mb-4">
            {sectionLabels[sectionKey] ?? sectionKey}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectionFields.map((field) => (
              <InlineEditField
                key={field.key}
                field={field}
                value={(unit as unknown as Record<string, unknown>)[field.key] as string | number | null}
                onSave={handleFieldSave}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------
// Inline-editable field
// -----------------------------------------------
function InlineEditField({
  field,
  value,
  onSave,
  t,
}: {
  field: FieldConfig;
  value: string | number | null;
  onSave: (key: string, value: string | number | null) => void;
  t: TFn;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    let parsed: string | number | null;
    if (draft === "") {
      parsed = null;
    } else if (field.type === "number") {
      parsed = Number(draft);
    } else {
      parsed = draft;
    }
    if (parsed !== value) {
      onSave(field.key, parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && field.type !== "textarea") {
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      setDraft(value != null ? String(value) : "");
      setEditing(false);
    }
  };

  const fieldLabel = t(`create.${field.label}`) !== `create.${field.label}`
    ? t(`create.${field.label}`)
    : field.label;

  const displayValue = (() => {
    if (value == null || value === "") return "\u2014";
    if (field.type === "select" && field.options) {
      const opt = field.options.find((o) => o.value === String(value));
      // Try to look up translated labels for status/unitType
      if (field.key === "status") return t(`statuses.${value}`);
      if (field.key === "unit_type") return t(`unitTypes.${value}`);
      return opt?.label ?? String(value);
    }
    if (field.type === "date") return formatDate(String(value));
    if (field.suffix) return `${value} ${field.suffix}`;
    return String(value);
  })();

  if (!field.editable) {
    return (
      <div>
        <p className="text-xs font-medium text-content-quaternary mb-0.5">{fieldLabel}</p>
        <p className="text-sm text-content-primary">{displayValue}</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value != null ? String(value) : "");
          setEditing(true);
        }}
        className="cursor-pointer group"
      >
        <p className="text-xs font-medium text-content-quaternary mb-0.5">{fieldLabel}</p>
        <p className="text-sm text-content-primary group-hover:text-green-400 transition-colors">
          {displayValue}
          <svg
            className="inline-block ml-1.5 h-3 w-3 text-content-quaternary opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </p>
      </div>
    );
  }

  // Editing mode
  if (field.type === "select" && field.options) {
    return (
      <div>
        <p className="text-xs font-medium text-content-quaternary mb-0.5">{fieldLabel}</p>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={handleBlur}
          className="w-full rounded-lg border border-green-500/50 bg-surface-tertiary px-3 py-1.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <p className="text-xs font-medium text-content-quaternary mb-0.5">{fieldLabel}</p>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full rounded-lg border border-green-500/50 bg-surface-tertiary px-3 py-1.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-content-quaternary mb-0.5">{fieldLabel}</p>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={field.type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-green-500/50 bg-surface-tertiary px-3 py-1.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
      />
    </div>
  );
}

// ===============================================
// TAB 2 -- Cost Ledger
// ===============================================
function CostLedgerTab({ unit, t }: { unit: OperateUnit; t: TFn }) {
  const [entries, setEntries] = useState<CostLedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters
  const [catFilter, setCatFilter] = useState<CostCategory | "">("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Manual entry form
  const [showForm, setShowForm] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      getUnitCostLedger(unit.id).then((res) => {
        setEntries(res.data);
        setLoaded(true);
        setLoading(false);
      });
    }
  }, [unit.id, loaded]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = entries;
    if (catFilter) result = result.filter((e) => e.category === catFilter);
    if (vendorFilter) {
      const q = vendorFilter.toLowerCase();
      result = result.filter((e) => e.vendor_name?.toLowerCase().includes(q));
    }
    if (dateFrom) result = result.filter((e) => e.posted_at >= dateFrom);
    if (dateTo) result = result.filter((e) => e.posted_at <= dateTo);
    return result;
  }, [entries, catFilter, vendorFilter, dateFrom, dateTo]);

  // Group by fiscal year
  const grouped = useMemo(() => {
    const map = new Map<number, CostLedgerEntry[]>();
    for (const e of filtered) {
      const year = e.fiscal_year;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => b - a);
  }, [filtered]);

  const lifetimeTotal = useMemo(
    () => entries.reduce((sum, e) => sum + e.total_cost, 0),
    [entries]
  );

  // Distinct vendors from entries
  const vendors = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.vendor_name) set.add(e.vendor_name);
    }
    return [...set].sort();
  }, [entries]);

  const handleEntryAdded = () => {
    setShowForm(false);
    setLoaded(false); // re-fetch
  };

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Lifetime total banner */}
      <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-5">
        <p className="text-xs font-medium text-content-quaternary uppercase tracking-wider">
          {t("costLedger.lifetimeTotal")}
        </p>
        <p className="text-3xl font-bold text-content-primary mt-1">
          {formatCurrency(lifetimeTotal)}
        </p>
      </div>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as CostCategory | "")}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("costLedger.allCategories")}</option>
          {COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("costLedger.allVendors")}</option>
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors ml-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("costLedger.addManual")}
        </button>
      </div>

      {/* Manual entry form */}
      {showForm && (
        <ManualCostEntryForm
          unitId={unit.id}
          t={t}
          onClose={() => setShowForm(false)}
          onAdded={handleEntryAdded}
        />
      )}

      {/* Grouped table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
            <svg className="h-6 w-6 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-content-primary">
            {t("costLedger.noEntries")}
          </h3>
          <p className="mt-1 text-xs text-content-tertiary">
            {t("costLedger.noEntriesHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([year, yearEntries]) => {
            const yearTotal = yearEntries.reduce((sum, e) => sum + e.total_cost, 0);
            return (
              <div key={year} className="rounded-xl border border-edge-secondary bg-surface-secondary overflow-hidden">
                {/* Year header */}
                <div className="flex items-center justify-between border-b border-edge-secondary bg-surface-tertiary px-4 py-2">
                  <span className="text-sm font-semibold text-content-primary">{year}</span>
                  <span className="text-sm font-medium text-content-secondary">
                    {t("costLedger.yearTotal")}: {formatCurrency(yearTotal)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-edge-secondary text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                        <th className="px-4 py-2">{t("costLedger.date")}</th>
                        <th className="px-4 py-2">{t("costLedger.description")}</th>
                        <th className="px-4 py-2">{t("costLedger.category")}</th>
                        <th className="px-4 py-2 text-right">{t("costLedger.laborCost")}</th>
                        <th className="px-4 py-2 text-right">{t("costLedger.partsCost")}</th>
                        <th className="px-4 py-2 text-right">{t("costLedger.totalCost")}</th>
                        <th className="px-4 py-2 hidden md:table-cell">{t("costLedger.vendor")}</th>
                        <th className="px-4 py-2 hidden md:table-cell">{t("costLedger.source")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge-secondary">
                      {yearEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface-tertiary transition-colors">
                          <td className="px-4 py-2 text-content-tertiary whitespace-nowrap">
                            {formatDate(entry.posted_at)}
                          </td>
                          <td className="px-4 py-2 text-content-primary">
                            {entry.description}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COST_CATEGORY_BADGE[entry.category] ?? COST_CATEGORY_BADGE.other}`}
                            >
                              {entry.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-content-secondary">
                            {formatCurrency(entry.labor_cost)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-content-secondary">
                            {formatCurrency(entry.parts_cost)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-medium text-content-primary">
                            {formatCurrency(entry.total_cost)}
                          </td>
                          <td className="px-4 py-2 text-content-secondary hidden md:table-cell">
                            {entry.vendor_name || "\u2014"}
                          </td>
                          <td className="px-4 py-2 hidden md:table-cell">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[entry.source]}`}
                            >
                              {t(`costLedger.sources.${entry.source}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------
// Manual Cost Entry Form
// -----------------------------------------------
function ManualCostEntryForm({
  unitId,
  t,
  onClose,
  onAdded,
}: {
  unitId: string;
  t: TFn;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<CostCategory>("general");
  const [labor, setLabor] = useState("");
  const [parts, setParts] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    setSaving(true);
    await addCostLedgerEntry(unitId, {
      description: desc.trim(),
      category,
      labor_cost: Number(labor) || 0,
      parts_cost: Number(parts) || 0,
      vendor_name: vendor.trim() || undefined,
      posted_at: date ? new Date(date).toISOString() : undefined,
    });
    setSaving(false);
    onAdded();
  };

  return (
    <div className="rounded-xl border border-green-500/30 bg-surface-secondary p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.description")} *
            </label>
            <input
              type="text"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.category")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CostCategory)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            >
              {COST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.vendor")}
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.laborCost")}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={labor}
              onChange={(e) => setLabor(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.partsCost")}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("costLedger.date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge-secondary px-4 py-2 text-sm text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            {t("create.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !desc.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {saving ? t("create.saving") : t("costLedger.addManual")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===============================================
// TAB 3 -- Work Orders
// ===============================================
function WorkOrdersTab({ unit, t }: { unit: OperateUnit; t: TFn }) {
  const [workOrders, setWorkOrders] = useState<Record<string, unknown>[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      getUnitWorkOrders(unit.id).then((res) => {
        setWorkOrders(res.data);
        setLoaded(true);
        setLoading(false);
      });
    }
  }, [unit.id, loaded]);

  const filtered = useMemo(() => {
    if (!statusFilter) return workOrders;
    return workOrders.filter((wo) => wo.status === statusFilter);
  }, [workOrders, statusFilter]);

  const WO_STATUS_BADGE: Record<string, string> = {
    pending: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
    assigned: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    completed: "bg-green-500/15 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
    invoiced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("workOrders.allStatuses")}</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="invoiced">Invoiced</option>
          <option value="paid">Paid</option>
        </select>
        <Link
          href={`/operate/work-orders/new?unit_id=${unit.id}&property_name=${encodeURIComponent(unit.property_name)}&unit_number=${encodeURIComponent(unit.unit_number)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors ml-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("workOrders.createWO")}
        </Link>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
            <svg className="h-6 w-6 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-content-primary">
            {t("workOrders.noWOs")}
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-edge-secondary bg-surface-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-secondary text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <th className="px-4 py-3">{t("costLedger.description")}</th>
                <th className="px-4 py-3">{t("workOrders.status")}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("workOrders.trade")}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("workOrders.vendor")}</th>
                <th className="px-4 py-3">{t("workOrders.created")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-secondary">
              {filtered.map((wo) => {
                const status = String(wo.status ?? "pending");
                return (
                  <tr
                    key={String(wo.id)}
                    className="hover:bg-surface-tertiary transition-colors cursor-pointer"
                    onClick={() => {
                      if (wo.id) window.location.href = `/operate/work-orders/${wo.id}`;
                    }}
                  >
                    <td className="px-4 py-3 text-content-primary">
                      {String(wo.description ?? wo.title ?? "\u2014")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${WO_STATUS_BADGE[status] ?? WO_STATUS_BADGE.pending}`}
                      >
                        {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-content-secondary hidden md:table-cell">
                      {String(wo.trade ?? "\u2014")}
                    </td>
                    <td className="px-4 py-3 text-content-secondary hidden md:table-cell">
                      {String(wo.vendor_name ?? wo.assigned_vendor_name ?? "\u2014")}
                    </td>
                    <td className="px-4 py-3 text-content-tertiary">
                      {formatDate(wo.created_at ? String(wo.created_at) : null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===============================================
// TAB 4 -- Inspections
// ===============================================
function InspectionsTab({ unit, t }: { unit: OperateUnit; t: TFn }) {
  const router = useRouter();
  const [inspections, setInspections] = useState<UnitInspection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      getUnitInspections(unit.id).then((res) => {
        setInspections(res.data);
        setLoaded(true);
        setLoading(false);
      });
    }
  }, [unit.id, loaded]);

  const handleCreated = () => {
    setShowForm(false);
    setLoaded(false);
  };

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("inspections.newInspection")}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <NewInspectionForm
          unitId={unit.id}
          t={t}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Table or empty */}
      {inspections.length === 0 && !showForm ? (
        <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
            <svg className="h-6 w-6 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-content-primary">
            {t("inspections.noInspections")}
          </h3>
        </div>
      ) : inspections.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-edge-secondary bg-surface-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-secondary text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <th className="px-4 py-3">{t("inspections.type")}</th>
                <th className="px-4 py-3">{t("inspections.conductedBy")}</th>
                <th className="px-4 py-3">{t("inspections.date")}</th>
                <th className="px-4 py-3">{t("inspections.rating")}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("inspections.notes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-secondary">
              {inspections.map((insp) => (
                <tr key={insp.id} className="hover:bg-surface-tertiary transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${INSPECTION_TYPE_BADGE[insp.inspection_type]}`}
                    >
                      {t(`inspections.types.${insp.inspection_type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-secondary">
                    {insp.conducted_by_name || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-content-tertiary">
                    {formatDate(insp.conducted_at)}
                  </td>
                  <td className="px-4 py-3">
                    <StarDisplay rating={insp.condition_rating} />
                  </td>
                  <td className="px-4 py-3 text-content-tertiary max-w-[200px] truncate hidden md:table-cell">
                    {insp.notes || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------
// Star display
// -----------------------------------------------
function StarDisplay({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-content-quaternary">\u2014</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? "text-amber-400" : "text-charcoal-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// -----------------------------------------------
// Star input (interactive)
// -----------------------------------------------
function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <svg
            className={`h-6 w-6 transition-colors ${
              star <= value ? "text-amber-400" : "text-charcoal-600 hover:text-amber-400/50"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------
// New Inspection Form
// -----------------------------------------------
function NewInspectionForm({
  unitId,
  t,
  onClose,
  onCreated,
}: {
  unitId: string;
  t: TFn;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [inspType, setInspType] = useState<InspectionType>("routine");
  const [conductedBy, setConductedBy] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await createUnitInspection(unitId, {
      inspection_type: inspType,
      conducted_by_name: conductedBy.trim() || undefined,
      conducted_at: date ? new Date(date).toISOString() : undefined,
      condition_rating: rating > 0 ? rating : undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="rounded-xl border border-green-500/30 bg-surface-secondary p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("inspections.form.inspectionType")}
            </label>
            <select
              value={inspType}
              onChange={(e) => setInspType(e.target.value as InspectionType)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            >
              {(["move_in", "move_out", "routine", "annual"] as InspectionType[]).map((iType) => (
                <option key={iType} value={iType}>
                  {t(`inspections.types.${iType}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("inspections.form.conductedBy")}
            </label>
            <input
              type="text"
              value={conductedBy}
              onChange={(e) => setConductedBy(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("inspections.form.date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("inspections.form.rating")}
            </label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("inspections.form.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("inspections.form.notesPlaceholder")}
              rows={3}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge-secondary px-4 py-2 text-sm text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            {t("create.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {saving ? t("inspections.form.saving") : t("inspections.form.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===============================================
// TAB 5 -- Documents
// ===============================================
function DocumentsTab({ unit, t }: { unit: OperateUnit; t: TFn }) {
  const [documents, setDocuments] = useState<UnitDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      getUnitDocuments(unit.id).then((res) => {
        setDocuments(res.data);
        setLoaded(true);
        setLoading(false);
      });
    }
  }, [unit.id, loaded]);

  const handleUploaded = () => {
    setShowForm(false);
    setLoaded(false);
  };

  const handleDelete = async (docId: string) => {
    setDeleting(docId);
    const result = await deleteUnitDocument(docId);
    setDeleting(null);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t("documents.upload")}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <UploadDocumentForm
          unitId={unit.id}
          t={t}
          onClose={() => setShowForm(false)}
          onUploaded={handleUploaded}
        />
      )}

      {/* Table or empty */}
      {documents.length === 0 && !showForm ? (
        <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
            <svg className="h-6 w-6 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-content-primary">
            {t("documents.noDocuments")}
          </h3>
        </div>
      ) : documents.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-edge-secondary bg-surface-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-secondary text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <th className="px-4 py-3">{t("documents.fileName")}</th>
                <th className="px-4 py-3">{t("documents.type")}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("documents.uploaded")}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("documents.size")}</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-secondary">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-tertiary transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dd-captures/${doc.storage_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 hover:underline font-medium"
                    >
                      {doc.file_name}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${DOC_TYPE_BADGE[doc.document_type]}`}
                    >
                      {t(`documents.types.${doc.document_type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-tertiary hidden md:table-cell">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3 text-content-tertiary hidden md:table-cell">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="rounded-md p-1.5 text-content-quaternary hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === doc.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------
// Upload Document Form
// -----------------------------------------------
function UploadDocumentForm({
  unitId,
  t,
  onClose,
  onUploaded,
}: {
  unitId: string;
  t: TFn;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", docType);
    formData.append("notes", notes.trim());
    await uploadUnitDocument(unitId, formData);
    setUploading(false);
    onUploaded();
  };

  return (
    <div className="rounded-xl border border-green-500/30 bg-surface-secondary p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("documents.form.selectFile")} *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-content-primary file:mr-3 file:rounded-lg file:border file:border-edge-secondary file:bg-surface-tertiary file:px-3 file:py-1.5 file:text-sm file:text-content-primary file:cursor-pointer hover:file:bg-surface-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("documents.form.documentType")}
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            >
              {(["lease", "warranty", "permit", "invoice", "other"] as DocumentType[]).map((dt) => (
                <option key={dt} value={dt}>
                  {t(`documents.types.${dt}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("documents.form.notes")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("documents.form.notesPlaceholder")}
              className="w-full rounded-lg border border-edge-secondary bg-surface-tertiary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge-secondary px-4 py-2 text-sm text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            {t("create.cancel")}
          </button>
          <button
            type="submit"
            disabled={uploading || !file}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {uploading ? t("documents.form.uploading") : t("documents.form.upload")}
          </button>
        </div>
      </form>
    </div>
  );
}
