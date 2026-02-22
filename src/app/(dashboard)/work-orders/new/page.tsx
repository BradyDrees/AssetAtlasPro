"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkOrder } from "@/app/actions/pm-work-orders";
import { getPmVendors } from "@/app/actions/pm-work-orders";
import type { WoPriority, WoBudgetType } from "@/lib/vendor/types";

const TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "General Maintenance",
  "Painting",
  "Flooring",
  "Roofing",
  "Appliance Repair",
  "Locksmith",
  "Carpentry",
  "Drywall",
  "Landscaping",
  "Pest Control",
  "Cleaning",
  "Other",
];

interface VendorOption {
  id: string;
  vendor_org_id: string;
  vendor_name: string;
  trades: string[];
  status: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Form state
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [description, setDescription] = useState("");
  const [pmNotes, setPmNotes] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [trade, setTrade] = useState("");
  const [priority, setPriority] = useState<WoPriority>("normal");
  const [budgetType, setBudgetType] = useState<WoBudgetType | "">("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  useEffect(() => {
    getPmVendors().then(({ data }) => {
      setVendors(data);
      setLoadingVendors(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!vendorOrgId) {
      alert("Please select a vendor");
      return;
    }

    setLoading(true);
    const { error } = await createWorkOrder({
      vendor_org_id: vendorOrgId,
      property_name: propertyName || undefined,
      property_address: propertyAddress || undefined,
      unit_number: unitNumber || undefined,
      description: description || undefined,
      pm_notes: pmNotes || undefined,
      access_notes: accessNotes || undefined,
      tenant_name: tenantName || undefined,
      tenant_phone: tenantPhone || undefined,
      trade: trade || undefined,
      priority,
      budget_type: (budgetType as WoBudgetType) || undefined,
      budget_amount: budgetAmount ? Number(budgetAmount) : undefined,
      scheduled_date: scheduledDate || undefined,
    });
    setLoading(false);

    if (error) {
      alert(error);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">
          Create Work Order
        </h1>
        <p className="text-sm text-content-tertiary mt-1">
          Assign a job to one of your connected vendors
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor selection */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Vendor
          </h2>
          {loadingVendors ? (
            <div className="h-10 bg-surface-secondary rounded-lg animate-pulse" />
          ) : vendors.length === 0 ? (
            <p className="text-sm text-content-tertiary">
              No connected vendors. Invite a vendor first.
            </p>
          ) : (
            <select
              value={vendorOrgId}
              onChange={(e) => setVendorOrgId(e.target.value)}
              className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">Select vendor...</option>
              {vendors.map((v) => (
                <option key={v.vendor_org_id} value={v.vendor_org_id}>
                  {v.vendor_name}
                  {v.trades.length > 0 && ` (${v.trades.join(", ")})`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Property info */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Property
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Property Name"
              className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="Unit # (optional)"
              className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <input
            type="text"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            placeholder="Property Address"
            className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {/* Job details */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Job Details
          </h2>
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">Select trade...</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Job description — what needs to be done?"
            rows={3}
            className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-content-tertiary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WoPriority)}
                className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-content-tertiary mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Budget
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <select
              value={budgetType}
              onChange={(e) => setBudgetType(e.target.value as WoBudgetType | "")}
              className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">No budget set</option>
              <option value="nte">Not-to-Exceed (NTE)</option>
              <option value="approved">Pre-approved Amount</option>
              <option value="estimate_required">Estimate Required</option>
            </select>
            {budgetType && budgetType !== "estimate_required" && (
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="$ Amount"
                min="0"
                step="0.01"
                className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Notes
          </h2>
          <textarea
            value={pmNotes}
            onChange={(e) => setPmNotes(e.target.value)}
            placeholder="Notes for the vendor (visible to them)"
            rows={2}
            className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <textarea
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder="Access instructions (gate codes, lockbox, etc.)"
            rows={2}
            className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {/* Tenant (optional) */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">
            Tenant (optional)
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Tenant name"
              className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              type="tel"
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
              placeholder="Tenant phone"
              className="p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !vendorOrgId}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Work Order"}
        </button>
      </form>
    </div>
  );
}
