"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VendorOrganization, VendorUser } from "@/lib/vendor/types";
import {
  updateVendorOrg,
  updateVendorUser,
  uploadOrgLogo,
} from "@/app/actions/vendor-profile";

// Common trades for multiselect
const AVAILABLE_TRADES = [
  "plumbing",
  "electrical",
  "hvac",
  "painting",
  "flooring",
  "roofing",
  "carpentry",
  "drywall",
  "appliance_repair",
  "locksmith",
  "landscaping",
  "pest_control",
  "cleaning",
  "general_maintenance",
  "demolition",
  "concrete",
  "fencing",
  "gutters",
  "windows_doors",
  "fire_safety",
] as const;

interface ProfileFormProps {
  org: VendorOrganization;
  user: VendorUser;
  isAdmin: boolean;
}

export function ProfileForm({ org, user, isAdmin }: ProfileFormProps) {
  const t = useTranslations("vendor.profile");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Org fields
  const [orgName, setOrgName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [orgPhone, setOrgPhone] = useState(org.phone ?? "");
  const [orgEmail, setOrgEmail] = useState(org.email ?? "");
  const [address, setAddress] = useState(org.address ?? "");
  const [city, setCity] = useState(org.city ?? "");
  const [state, setState] = useState(org.state ?? "");
  const [zip, setZip] = useState(org.zip ?? "");
  const [serviceRadius, setServiceRadius] = useState(org.service_radius_miles);
  const [maxJobs, setMaxJobs] = useState(org.max_concurrent_jobs);
  const [selectedTrades, setSelectedTrades] = useState<string[]>(org.trades ?? []);

  // User fields
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [userPhone, setUserPhone] = useState(user.phone ?? "");
  const [userEmail, setUserEmail] = useState(user.email ?? "");

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveOrg = useCallback(async () => {
    if (!isAdmin) return;
    setSaving(true);
    setMessage(null);

    const { success, error } = await updateVendorOrg({
      name: orgName,
      description: description || undefined,
      phone: orgPhone || undefined,
      email: orgEmail || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      service_radius_miles: serviceRadius,
      max_concurrent_jobs: maxJobs,
      trades: selectedTrades,
    });

    if (success) {
      setMessage({ type: "success", text: t("savedSuccess") });
      startTransition(() => router.refresh());
    } else {
      setMessage({ type: "error", text: error ?? t("saveError") });
    }
    setSaving(false);
  }, [
    isAdmin, orgName, description, orgPhone, orgEmail, address,
    city, state, zip, serviceRadius, maxJobs, selectedTrades, t, router,
  ]);

  const handleSaveUser = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    const { success, error } = await updateVendorUser({
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: userPhone || undefined,
      email: userEmail || undefined,
    });

    if (success) {
      setMessage({ type: "success", text: t("savedSuccess") });
      startTransition(() => router.refresh());
    } else {
      setMessage({ type: "error", text: error ?? t("saveError") });
    }
    setSaving(false);
  }, [firstName, lastName, userPhone, userEmail, t, router]);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);

      const { error } = await uploadOrgLogo(formData);
      if (error) {
        setMessage({ type: "error", text: error });
      } else {
        setMessage({ type: "success", text: t("logoUploaded") });
        startTransition(() => router.refresh());
      }
      setUploadingLogo(false);
    },
    [t, router]
  );

  const toggleTrade = useCallback((trade: string) => {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Logo + Company Info */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">
          {t("companyInfo")}
        </h2>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-surface-secondary border border-edge-secondary flex items-center justify-center overflow-hidden">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
              </svg>
            )}
          </div>
          {isAdmin && (
            <>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="text-sm text-brand-400 hover:text-brand-300 disabled:opacity-50"
              >
                {uploadingLogo ? t("uploading") : t("changeLogo")}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("companyName")}</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("orgEmail")}</label>
            <input
              type="email"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("orgPhone")}</label>
            <input
              type="tel"
              value={orgPhone}
              onChange={(e) => setOrgPhone(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-content-secondary mb-1">{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
              rows={3}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {/* Address */}
        <h3 className="text-sm font-medium text-content-secondary mt-6 mb-3">{t("address")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder={t("streetAddress")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder={t("city")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={t("state")}
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
            <input
              type="text"
              placeholder={t("zip")}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
            />
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleSaveOrg}
            disabled={saving || isPending}
            className="mt-6 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("saveCompany")}
          </button>
        )}
      </div>

      {/* Service Area & Trades */}
      {isAdmin && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">
            {t("serviceSettings")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-content-secondary mb-1">
                {t("serviceRadius")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-24 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
                />
                <span className="text-sm text-content-tertiary">{t("miles")}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-content-secondary mb-1">
                {t("maxConcurrentJobs")}
              </label>
              <input
                type="number"
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value))}
                min={1}
                max={100}
                className="w-24 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
              />
            </div>
          </div>

          <h3 className="text-sm font-medium text-content-secondary mb-3">
            {t("tradesOffered")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TRADES.map((trade) => (
              <button
                key={trade}
                onClick={() => toggleTrade(trade)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedTrades.includes(trade)
                    ? "bg-brand-600/20 text-brand-400 border-brand-500/30"
                    : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:border-edge-primary"
                }`}
              >
                {t(`trades.${trade}`)}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveOrg}
            disabled={saving || isPending}
            className="mt-6 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("saveSettings")}
          </button>
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">
          {t("personalInfo")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("firstName")}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("lastName")}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("userPhone")}</label>
            <input
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">{t("userEmail")}</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-content-quaternary">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-500" />
          {t("roleLabel")}: <span className="font-medium text-content-tertiary capitalize">{user.role}</span>
        </div>

        <button
          onClick={handleSaveUser}
          disabled={saving || isPending}
          className="mt-6 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? t("saving") : t("savePersonal")}
        </button>
      </div>
    </div>
  );
}
