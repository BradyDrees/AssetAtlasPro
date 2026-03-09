"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateOrgSettings } from "@/app/actions/vendor-profile";
import type { VendorOrgSettings, TaxRate } from "@/lib/vendor/types";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Format raw underscore strings like "pending_parts" → "Pending Parts" */
function formatLabel(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface OrgSettingsFormProps {
  initialSettings: VendorOrgSettings;
}

export function OrgSettingsForm({ initialSettings }: OrgSettingsFormProps) {
  const t = useTranslations("vendor.profile");
  const [isPending, startTransition] = useTransition();

  // Numbering
  const [estimatePrefix, setEstimatePrefix] = useState(initialSettings.numbering?.estimate_prefix || "");
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings.numbering?.invoice_prefix || "");
  const [nextEstimate, setNextEstimate] = useState(initialSettings.numbering?.next_estimate || 1);
  const [nextInvoice, setNextInvoice] = useState(initialSettings.numbering?.next_invoice || 1);

  // Tax Rates
  const [taxRates, setTaxRates] = useState<TaxRate[]>(initialSettings.tax_rates || []);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");

  // Job Types
  const [jobTypes, setJobTypes] = useState<string[]>(initialSettings.job_types || []);
  const [newJobType, setNewJobType] = useState("");

  // Sub-Statuses
  const [subStatuses, setSubStatuses] = useState<string[]>(initialSettings.sub_statuses || []);
  const [newSubStatus, setNewSubStatus] = useState("");

  // Working Hours
  const [startTime, setStartTime] = useState(initialSettings.working_hours?.start || "08:00");
  const [endTime, setEndTime] = useState(initialSettings.working_hours?.end || "17:00");
  const [workingDays, setWorkingDays] = useState<number[]>(
    initialSettings.working_hours?.days || [1, 2, 3, 4, 5]
  );

  // Auto-Show Estimate
  const [autoShowEstimate, setAutoShowEstimate] = useState(initialSettings.auto_show_estimate || false);

  // SMS Notification Statuses
  const SMS_STATUSES = ["scheduled", "en_route", "on_site", "completed"] as const;
  const [smsStatuses, setSmsStatuses] = useState<string[]>(
    initialSettings.sms_notification_statuses ?? [...SMS_STATUSES]
  );

  function toggleSmsStatus(status: string) {
    setSmsStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  // Auto Follow-Ups
  const [autoFollowups, setAutoFollowups] = useState(initialSettings.auto_followups_enabled ?? true);

  // Google Review URL
  const [googleReviewUrl, setGoogleReviewUrl] = useState(initialSettings.google_review_url || "");
  const [googleUrlError, setGoogleUrlError] = useState("");

  function validateGoogleUrl(url: string): boolean {
    if (!url.trim()) return true; // empty = valid (clears it)
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      if (!/^(.*\.)?google\.(com|[a-z]{2}|co\.[a-z]{2})$/.test(parsed.hostname)) return false;
      if (url.length > 500) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Feedback
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // --- Tax Rate Handlers ---
  function addTaxRate() {
    const name = newTaxName.trim();
    const rate = parseFloat(newTaxRate);
    if (!name || isNaN(rate)) return;
    const hasDefault = taxRates.some((tr) => tr.is_default);
    setTaxRates([...taxRates, { name, rate, is_default: !hasDefault }]);
    setNewTaxName("");
    setNewTaxRate("");
  }

  function removeTaxRate(index: number) {
    setTaxRates(taxRates.filter((_, i) => i !== index));
  }

  function toggleTaxDefault(index: number) {
    setTaxRates(
      taxRates.map((tr, i) => ({ ...tr, is_default: i === index }))
    );
  }

  // --- Job Type Handlers ---
  function addJobType() {
    const val = newJobType.trim();
    if (!val || jobTypes.includes(val)) return;
    setJobTypes([...jobTypes, val]);
    setNewJobType("");
  }

  function removeJobType(val: string) {
    setJobTypes(jobTypes.filter((jt) => jt !== val));
  }

  // --- Sub-Status Handlers ---
  function addSubStatus() {
    const val = newSubStatus.trim();
    if (!val || subStatuses.includes(val)) return;
    setSubStatuses([...subStatuses, val]);
    setNewSubStatus("");
  }

  function removeSubStatus(val: string) {
    setSubStatuses(subStatuses.filter((s) => s !== val));
  }

  // --- Day Toggle ---
  function toggleDay(dayIndex: number) {
    setWorkingDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  }

  // --- Save ---
  function handleSave() {
    setSuccessMsg("");
    setErrorMsg("");
    startTransition(async () => {
      try {
        const settings: VendorOrgSettings = {
          settings_version: initialSettings.settings_version ?? 1,
          numbering: {
            estimate_prefix: estimatePrefix,
            invoice_prefix: invoicePrefix,
            next_estimate: nextEstimate,
            next_invoice: nextInvoice,
          },
          tax_rates: taxRates,
          job_types: jobTypes,
          sub_statuses: subStatuses,
          working_hours: {
            start: startTime,
            end: endTime,
            days: workingDays,
          },
          auto_show_estimate: autoShowEstimate,
          custom_field_schemas: initialSettings.custom_field_schemas ?? { work_orders: [], estimates: [], invoices: [] },
          sms_notification_statuses: smsStatuses,
          auto_followups_enabled: autoFollowups,
          google_review_url: googleReviewUrl.trim() || undefined,
        };
        const result = await updateOrgSettings(settings);
        if (result?.error) {
          setErrorMsg(result.error);
        } else {
          setSuccessMsg(t("settings.saved"));
        }
      } catch {
        setErrorMsg(t("settings.saveError"));
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600";
  return (
    <div className="space-y-6">
      {/* Numbering */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-sm font-semibold text-content-primary">
          {t("settings.numbering")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.estimatePrefix")}
            </label>
            <input
              type="text"
              className={inputClass}
              value={estimatePrefix}
              onChange={(e) => setEstimatePrefix(e.target.value)}
              placeholder="EST-"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.invoicePrefix")}
            </label>
            <input
              type="text"
              className={inputClass}
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="INV-"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.nextEstimate")}
            </label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={nextEstimate}
              onChange={(e) => setNextEstimate(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.nextInvoice")}
            </label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={nextInvoice}
              onChange={(e) => setNextInvoice(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </div>
      {/* Tax Rates */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-sm font-semibold text-content-primary">
          {t("settings.taxRates")}
        </h3>
        {taxRates.length > 0 && (
          <div className="mb-4 space-y-2">
            {taxRates.map((tr, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-edge-secondary bg-surface-secondary px-3 py-2"
              >
                <span className="flex-1 text-sm text-content-primary">{tr.name}</span>
                <span className="text-sm text-content-secondary">{tr.rate}%</span>
                <button
                  type="button"
                  onClick={() => toggleTaxDefault(i)}
                  className={
                    "rounded-md px-2 py-0.5 text-xs font-medium transition-colors " +
                    (tr.is_default
                      ? "bg-brand-600 text-white"
                      : "bg-surface-tertiary text-content-secondary hover:bg-surface-secondary")
                  }
                >
                  {t("settings.default")}
                </button>
                <button
                  type="button"
                  onClick={() => removeTaxRate(i)}
                  className="text-content-muted transition-colors hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.taxName")}
            </label>
            <input
              type="text"
              className={inputClass}
              value={newTaxName}
              onChange={(e) => setNewTaxName(e.target.value)}
              placeholder={t("settings.taxNamePlaceholder")}
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.rate")}
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              value={newTaxRate}
              onChange={(e) => setNewTaxRate(e.target.value)}
              placeholder="%"
            />
          </div>
          <button
            type="button"
            onClick={addTaxRate}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {t("settings.add")}
          </button>
        </div>
      </div>
      {/* Job Types */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-sm font-semibold text-content-primary">
          {t("settings.jobTypes")}
        </h3>
        {jobTypes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {jobTypes.map((jt) => (
              <span
                key={jt}
                className="inline-flex items-center gap-1 rounded-full border border-edge-secondary bg-surface-secondary px-3 py-1 text-xs font-medium text-content-primary"
              >
                {formatLabel(jt)}
                <button
                  type="button"
                  onClick={() => removeJobType(jt)}
                  className="ml-0.5 text-content-muted transition-colors hover:text-red-500"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            className={inputClass + " flex-1"}
            value={newJobType}
            onChange={(e) => setNewJobType(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addJobType(); } }}
            placeholder={t("settings.jobTypePlaceholder")}
          />
          <button
            type="button"
            onClick={addJobType}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {t("settings.add")}
          </button>
        </div>
      </div>

      {/* Sub-Statuses */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-sm font-semibold text-content-primary">
          {t("settings.subStatuses")}
        </h3>
        {subStatuses.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {subStatuses.map((ss) => (
              <span
                key={ss}
                className="inline-flex items-center gap-1 rounded-full border border-edge-secondary bg-surface-secondary px-3 py-1 text-xs font-medium text-content-primary"
              >
                {formatLabel(ss)}
                <button
                  type="button"
                  onClick={() => removeSubStatus(ss)}
                  className="ml-0.5 text-content-muted transition-colors hover:text-red-500"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            className={inputClass + " flex-1"}
            value={newSubStatus}
            onChange={(e) => setNewSubStatus(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubStatus(); } }}
            placeholder={t("settings.subStatusPlaceholder")}
          />
          <button
            type="button"
            onClick={addSubStatus}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {t("settings.add")}
          </button>
        </div>
      </div>
      {/* Working Hours */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-sm font-semibold text-content-primary">
          {t("settings.workingHours")}
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.startTime")}
            </label>
            <input
              type="time"
              className={inputClass}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-secondary">
              {t("settings.endTime")}
            </label>
            <input
              type="time"
              className={inputClass}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS.map((day, idx) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(idx)}
              className={
                "h-9 w-9 rounded-full text-xs font-semibold transition-colors " +
                (workingDays.includes(idx)
                  ? "bg-brand-600 text-white"
                  : "border border-edge-primary bg-surface-secondary text-content-secondary hover:bg-surface-tertiary")
              }
            >
              {t("settings.days." + day)}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Show Estimate */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">
              {t("settings.autoShowEstimate")}
            </h3>
            <p className="mt-0.5 text-xs text-content-secondary">
              {t("settings.autoShowEstimateDesc")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoShowEstimate}
            onClick={() => setAutoShowEstimate(!autoShowEstimate)}
            className={
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors " +
              (autoShowEstimate ? "bg-brand-600" : "bg-surface-tertiary")
            }
          >
            <span
              className={
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform " +
                (autoShowEstimate ? "translate-x-5" : "translate-x-0")
              }
            />
          </button>
        </div>
      </div>

      {/* SMS Notifications */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-1 text-sm font-semibold text-content-primary">
          {t("settings.smsNotifications")}
        </h3>
        <p className="mb-4 text-xs text-content-secondary">
          {t("settings.smsNotificationsDesc")}
        </p>
        <div className="space-y-2">
          {SMS_STATUSES.map((status) => (
            <label key={status} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsStatuses.includes(status)}
                onChange={() => toggleSmsStatus(status)}
                className="h-4 w-4 rounded border-edge-primary text-brand-600 focus:ring-brand-600"
              />
              <span className="text-sm text-content-primary">
                {t(`settings.smsStatus_${status}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Auto Follow-Ups */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">
              {t("settings.autoFollowups")}
            </h3>
            <p className="mt-0.5 text-xs text-content-secondary">
              {t("settings.autoFollowupsDesc")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoFollowups}
            onClick={() => setAutoFollowups(!autoFollowups)}
            className={
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors " +
              (autoFollowups ? "bg-brand-600" : "bg-surface-tertiary")
            }
          >
            <span
              className={
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform " +
                (autoFollowups ? "translate-x-5" : "translate-x-0")
              }
            />
          </button>
        </div>
      </div>

      {/* Google Review Link */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-1 text-sm font-semibold text-content-primary">
          {t("settings.googleReviewUrl")}
        </h3>
        <p className="mb-3 text-xs text-content-secondary">
          {t("settings.googleReviewUrlDesc")}
        </p>
        <input
          type="url"
          className={inputClass}
          value={googleReviewUrl}
          onChange={(e) => {
            setGoogleReviewUrl(e.target.value);
            if (e.target.value && !validateGoogleUrl(e.target.value)) {
              setGoogleUrlError(t("settings.googleReviewUrlInvalid"));
            } else {
              setGoogleUrlError("");
            }
          }}
          placeholder="https://g.page/r/..."
        />
        {googleUrlError && (
          <p className="mt-1 text-xs text-red-500">{googleUrlError}</p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? t("settings.saving") : t("settings.save")}
        </button>
        {successMsg && (
          <p className="text-sm font-medium text-green-600">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="text-sm font-medium text-red-500">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
