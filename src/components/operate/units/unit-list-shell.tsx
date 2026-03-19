"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  OperateUnit,
  UnitStatus,
  UnitType,
  CreateUnitInput,
} from "@/app/actions/operate-units";
import { createOperateUnit } from "@/app/actions/operate-units";

// -----------------------------------------------
// Types
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;

interface UnitListShellProps {
  initialUnits: OperateUnit[];
  properties: string[];
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
// Status badge colours
// -----------------------------------------------
const STATUS_BADGE: Record<UnitStatus, string> = {
  occupied: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  vacant: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  turn_in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ready_to_lease: "bg-green-500/15 text-green-400 border-green-500/30",
};

// -----------------------------------------------
// Constants
// -----------------------------------------------
const UNIT_TYPES: UnitType[] = ["studio", "1br", "2br", "3br", "4br", "other"];
const UNIT_STATUSES: UnitStatus[] = [
  "occupied",
  "vacant",
  "turn_in_progress",
  "ready_to_lease",
];

type SortKey =
  | "unit_number"
  | "property_name"
  | "unit_type"
  | "status"
  | "tenant_name"
  | "lease_end"
  | "lifetime_cost"
  | "open_wo_count"
  | "last_inspection_date";

// -----------------------------------------------
// Main component
// -----------------------------------------------
export function UnitListShell({
  initialUnits,
  properties,
  messages,
}: UnitListShellProps) {
  const t = useMemo(() => createT(messages), [messages]);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<UnitStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<UnitType | "">("");

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("property_name");
  const [sortAsc, setSortAsc] = useState(true);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);

  // Client-side filtered data
  const filteredUnits = useMemo(() => {
    let result = initialUnits;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.unit_number.toLowerCase().includes(q) ||
          u.property_name.toLowerCase().includes(q) ||
          (u.tenant_name && u.tenant_name.toLowerCase().includes(q)) ||
          (u.property_address && u.property_address.toLowerCase().includes(q))
      );
    }

    if (propertyFilter) {
      result = result.filter((u) => u.property_name === propertyFilter);
    }

    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }

    if (typeFilter) {
      result = result.filter((u) => u.unit_type === typeFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      const aStr = String(av).toLowerCase();
      const bStr = String(bv).toLowerCase();
      return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return result;
  }, [
    initialUnits,
    search,
    propertyFilter,
    statusFilter,
    typeFilter,
    sortKey,
    sortAsc,
  ]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortAsc((prev) => !prev);
      } else {
        setSortKey(key);
        setSortAsc(true);
      }
    },
    [sortKey]
  );

  const sortArrow = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) return "";
      return sortAsc ? " \u2191" : " \u2193";
    },
    [sortKey, sortAsc]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">
            {t("title")}
          </h1>
          <p className="text-sm text-content-tertiary mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("addUnit")}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t("filters.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("filters.allProperties")}</option>
          {properties.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UnitStatus | "")}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("filters.allStatuses")}</option>
          {UNIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as UnitType | "")}
          className="rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">{t("filters.allTypes")}</option>
          {UNIT_TYPES.map((ut) => (
            <option key={ut} value={ut}>
              {t(`unitTypes.${ut}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filteredUnits.length === 0 ? (
        <div className="rounded-xl border border-edge-secondary bg-surface-secondary p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
            <svg
              className="h-6 w-6 text-content-quaternary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-content-primary">
            {t("empty.title")}
          </h3>
          <p className="mt-1 text-xs text-content-tertiary">
            {t("empty.subtitle")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-edge-secondary bg-surface-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-secondary text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary"
                  onClick={() => handleSort("unit_number")}
                >
                  {t("columns.unitNumber")}
                  {sortArrow("unit_number")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary"
                  onClick={() => handleSort("property_name")}
                >
                  {t("columns.property")}
                  {sortArrow("property_name")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary hidden md:table-cell"
                  onClick={() => handleSort("unit_type")}
                >
                  {t("columns.type")}
                  {sortArrow("unit_type")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary"
                  onClick={() => handleSort("status")}
                >
                  {t("columns.status")}
                  {sortArrow("status")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary hidden lg:table-cell"
                  onClick={() => handleSort("tenant_name")}
                >
                  {t("columns.tenant")}
                  {sortArrow("tenant_name")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary hidden lg:table-cell"
                  onClick={() => handleSort("lease_end")}
                >
                  {t("columns.leaseEnd")}
                  {sortArrow("lease_end")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right hover:text-content-primary hidden md:table-cell"
                  onClick={() => handleSort("lifetime_cost")}
                >
                  {t("columns.lifetimeCost")}
                  {sortArrow("lifetime_cost")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center hover:text-content-primary hidden md:table-cell"
                  onClick={() => handleSort("open_wo_count")}
                >
                  {t("columns.openWOs")}
                  {sortArrow("open_wo_count")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-content-primary hidden xl:table-cell"
                  onClick={() => handleSort("last_inspection_date")}
                >
                  {t("columns.lastInspection")}
                  {sortArrow("last_inspection_date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-secondary">
              {filteredUnits.map((unit) => (
                <tr
                  key={unit.id}
                  onClick={() => router.push(`/operate/units/${unit.id}`)}
                  className="cursor-pointer hover:bg-surface-tertiary transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-content-primary">
                    {unit.unit_number}
                  </td>
                  <td className="px-4 py-3 text-content-secondary">
                    {unit.property_name}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center rounded-md border border-edge-secondary bg-surface-tertiary px-2 py-0.5 text-xs text-content-tertiary">
                      {t(`unitTypes.${unit.unit_type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[unit.status]}`}
                    >
                      {t(`statuses.${unit.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-secondary hidden lg:table-cell">
                    {unit.tenant_name || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-content-tertiary hidden lg:table-cell">
                    {formatDate(unit.lease_end)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-content-secondary hidden md:table-cell">
                    {formatCurrency(unit.lifetime_cost)}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {unit.open_wo_count > 0 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-xs font-medium text-amber-400">
                        {unit.open_wo_count}
                      </span>
                    ) : (
                      <span className="text-content-quaternary">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-content-tertiary hidden xl:table-cell">
                    {formatDate(unit.last_inspection_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Unit Modal */}
      {showCreate && (
        <CreateUnitModal
          t={t}
          properties={properties}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------
// Create Unit Modal
// -----------------------------------------------
function CreateUnitModal({
  t,
  properties,
  onClose,
  onCreated,
}: {
  t: TFn;
  properties: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUnitInput>({
    property_name: "",
    unit_number: "",
    unit_type: "other",
    status: "vacant",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.property_name || !form.unit_number) return;
    setSaving(true);
    setError(null);
    const result = await createOperateUnit(form);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onCreated();
    }
  };

  const set = (key: keyof CreateUnitInput, value: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-edge-secondary bg-surface-primary p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-content-primary mb-4">
          {t("create.title")}
        </h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Name */}
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("create.propertyName")} *
            </label>
            <input
              list="property-names"
              type="text"
              required
              value={form.property_name}
              onChange={(e) => set("property_name", e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
            <datalist id="property-names">
              {properties.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* Unit Number */}
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("create.unitNumber")} *
            </label>
            <input
              type="text"
              required
              value={form.unit_number}
              onChange={(e) => set("unit_number", e.target.value)}
              className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>

          {/* Unit Type + Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                {t("create.unitType")}
              </label>
              <select
                value={form.unit_type}
                onChange={(e) => set("unit_type", e.target.value)}
                className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                {(["studio", "1br", "2br", "3br", "4br", "other"] as UnitType[]).map(
                  (ut) => (
                    <option key={ut} value={ut}>
                      {t(`unitTypes.${ut}`)}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                {t("create.status")}
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                {(
                  [
                    "occupied",
                    "vacant",
                    "turn_in_progress",
                    "ready_to_lease",
                  ] as UnitStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Beds / Baths / Sqft Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                {t("create.beds")}
              </label>
              <input
                type="number"
                min={0}
                value={form.beds ?? ""}
                onChange={(e) =>
                  set("beds", e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                {t("create.baths")}
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.baths ?? ""}
                onChange={(e) =>
                  set("baths", e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                {t("create.sqft")}
              </label>
              <input
                type="number"
                min={0}
                value={form.sqft ?? ""}
                onChange={(e) =>
                  set("sqft", e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-edge-secondary px-4 py-2 text-sm text-content-secondary hover:bg-surface-tertiary transition-colors"
            >
              {t("create.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || !form.property_name || !form.unit_number}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t("create.saving") : t("create.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
