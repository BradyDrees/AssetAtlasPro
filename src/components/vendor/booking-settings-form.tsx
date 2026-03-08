"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateVendorOrg, regenerateApiKey } from "@/app/actions/vendor-profile";
import { TRADE_LABELS, isReservedSlug } from "@/lib/vendor/directory-utils";

interface BookingSettingsFormProps {
  initialSlug: string | null;
  initialEnabled: boolean;
  initialHeadline: string | null;
  initialDescription: string | null;
  initialBookingTrades: string[] | null;
  initialApiKey: string | null;
  orgTrades: string[];
}

export function BookingSettingsForm({
  initialSlug,
  initialEnabled,
  initialHeadline,
  initialDescription,
  initialBookingTrades,
  initialApiKey,
  orgTrades,
}: BookingSettingsFormProps) {
  const t = useTranslations("vendor.booking");
  const [isPending, startTransition] = useTransition();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug || "");
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [selectedTrades, setSelectedTrades] = useState<string[]>(initialBookingTrades || []);
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [copied, setCopied] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://www.assetatlaspro.com";

  const bookingUrl = slug ? `${baseUrl}/book/${slug}` : "";
  const embedCode = slug
    ? `<iframe src="${baseUrl}/book/${slug}/embed" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
    : "";

  function handleTradeToggle(trade: string) {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function handleSave() {
    setError("");
    setSaved(false);

    // Sanitize slug
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (enabled && !cleanSlug) {
      setError("A URL slug is required when booking is enabled");
      return;
    }

    if (cleanSlug && isReservedSlug(cleanSlug)) {
      setError("This URL slug is reserved. Please choose a different one.");
      return;
    }

    startTransition(async () => {
      const result = await updateVendorOrg({
        slug: cleanSlug || null,
        booking_enabled: enabled,
        booking_headline: headline || null,
        booking_description: description || null,
        booking_trades: selectedTrades.length > 0 ? selectedTrades : null,
      });

      if (result.success) {
        setSaved(true);
        setSlug(cleanSlug);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || t("saveError"));
      }
    });
  }

  async function handleRegenerateKey() {
    if (!confirm(t("regenerateConfirm"))) return;
    const result = await regenerateApiKey();
    if (result.api_key) setApiKey(result.api_key);
  }

  const trades = orgTrades.length > 0 ? orgTrades : Object.keys(TRADE_LABELS);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-6">
      <h2 className="text-lg font-semibold text-content-primary">{t("title")}</h2>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-content-primary">{t("enableBooking")}</p>
          <p className="text-xs text-content-tertiary">{t("enableBookingDesc")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-brand-600" : "bg-charcoal-300"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1">{t("slug")}</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("slugPlaceholder")}
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-primary"
            />
            {slug && (
              <p className="mt-1 text-xs text-content-quaternary">
                {t("slugPreview")}: <span className="text-brand-500">{bookingUrl}</span>
              </p>
            )}
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1">{t("headline")}</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={t("headlinePlaceholder")}
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1">{t("description")}</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-primary resize-none"
            />
          </div>

          {/* Trade Selection */}
          <div>
            <p className="text-sm font-medium text-content-primary mb-1">{t("selectTrades")}</p>
            <p className="text-xs text-content-tertiary mb-2">{t("selectTradesDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {trades.map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => handleTradeToggle(trade)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedTrades.includes(trade)
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:text-content-primary"
                  }`}
                >
                  {TRADE_LABELS[trade] || trade}
                </button>
              ))}
            </div>
          </div>

          {/* Booking URL */}
          {slug && (
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">{t("bookingUrl")}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-surface-tertiary border border-edge-secondary rounded-lg text-xs text-content-secondary break-all">
                  {bookingUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bookingUrl, "url")}
                  className="px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors whitespace-nowrap"
                >
                  {copied === "url" ? t("copied") : t("copyUrl")}
                </button>
              </div>
            </div>
          )}

          {/* Embed Code */}
          {slug && (
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">{t("embedCode")}</label>
              <p className="text-xs text-content-tertiary mb-2">{t("embedCodeDesc")}</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 px-3 py-2 bg-surface-tertiary border border-edge-secondary rounded-lg text-xs text-content-secondary break-all font-mono">
                  {embedCode}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(embedCode, "embed")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-xs font-medium text-content-secondary hover:text-content-primary transition-colors whitespace-nowrap"
                >
                  {copied === "embed" ? t("copied") : t("copyEmbed")}
                </button>
              </div>
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1">{t("apiKey")}</label>
            <p className="text-xs text-content-tertiary mb-2">{t("apiKeyDesc")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-surface-tertiary border border-edge-secondary rounded-lg text-xs text-content-secondary font-mono truncate">
                {apiKey || "—"}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(apiKey, "api")}
                className="px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-xs font-medium text-content-secondary hover:text-content-primary transition-colors whitespace-nowrap"
              >
                {copied === "api" ? t("copied") : t("copyApiKey")}
              </button>
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                {t("regenerateApiKey")}
              </button>
            </div>
          </div>

          {/* API Docs */}
          <div className="bg-surface-tertiary rounded-lg p-4">
            <p className="text-sm font-medium text-content-primary mb-1">{t("apiDocs")}</p>
            <p className="text-xs text-content-tertiary font-mono">{t("apiDocsDesc")}</p>
          </div>
        </>
      )}

      {/* Save */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t("saved")}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </div>
  );
}
