"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createVendorAccount } from "@/app/actions/vendor-onboarding";

const TRADE_KEYS = [
  "plumbing",
  "electrical",
  "hvac",
  "general",
  "painting",
  "flooring",
  "roofing",
  "appliance",
  "carpentry",
  "landscaping",
  "cleaning",
  "pest",
  "locksmith",
  "other",
] as const;

export default function VendorOnboardingPage() {
  const t = useTranslations("vendor.onboarding");
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const [serviceRadius, setServiceRadius] = useState(25);
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(10);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTrade = (trade: string) => {
    setTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createVendorAccount({
        companyName,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        trades,
        serviceRadius,
        maxConcurrentJobs,
        description: description || undefined,
      });

      if (result?.error === "already_exists") {
        setError(t("alreadyHaveAccount"));
        setLoading(false);
        return;
      }

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Server action redirects on success — if we get here, push manually
      router.push("/vendor");
    } catch {
      // redirect() throws a NEXT_REDIRECT error which is expected
    }
  };

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-content-primary mb-1">
            Asset <span className="text-brand-500">Atlas</span> Pro
          </h1>
          <h2 className="text-2xl font-bold text-content-primary mt-4">
            {t("title")}
          </h2>
          <p className="text-content-tertiary mt-2">{t("subtitle")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-content-primary mb-1"
            >
              {t("companyName")} *
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("companyNamePlaceholder")}
              required
              className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Contact info row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-content-primary mb-1"
            >
              {t("address")}
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* City / State / Zip row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label
                htmlFor="city"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("city")}
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("state")}
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="zip"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("zip")}
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Trades */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              {t("trades")} *
            </label>
            <p className="text-xs text-content-tertiary mb-3">
              {t("tradesPlaceholder")}
            </p>
            <div className="flex flex-wrap gap-2">
              {TRADE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTrade(key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    trades.includes(key)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-surface-secondary text-content-secondary border-edge-primary hover:border-brand-400"
                  }`}
                >
                  {t(`tradesOptions.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Service radius + max jobs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="serviceRadius"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("serviceRadius")}
              </label>
              <input
                id="serviceRadius"
                type="number"
                min={1}
                max={500}
                value={serviceRadius}
                onChange={(e) =>
                  setServiceRadius(parseInt(e.target.value) || 25)
                }
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="maxJobs"
                className="block text-sm font-medium text-content-primary mb-1"
              >
                {t("maxConcurrentJobs")}
              </label>
              <input
                id="maxJobs"
                type="number"
                min={1}
                max={100}
                value={maxConcurrentJobs}
                onChange={(e) =>
                  setMaxConcurrentJobs(parseInt(e.target.value) || 10)
                }
                className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-content-primary mb-1"
            >
              {t("description")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-secondary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !companyName || trades.length === 0}
            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 transition-all font-medium shadow-md shadow-brand-500/20"
          >
            {loading ? t("creating") : t("createAccount")}
          </button>
        </form>
      </div>
    </div>
  );
}
