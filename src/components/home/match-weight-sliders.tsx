"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMatchWeights } from "@/app/actions/home-work-orders";

type Preset = "balanced" | "best_price" | "best_vendor" | "fastest" | "custom";

interface MatchWeightSlidersProps {
  initialPreset: Preset;
  initialWeights: {
    proximity: number;
    rating: number;
    availability: number;
    response: number;
    price: number;
  };
}

const PRESET_WEIGHTS: Record<Exclude<Preset, "custom">, [number, number, number, number, number]> = {
  balanced:    [20, 20, 20, 20, 20],
  best_price:  [15, 20, 10, 5, 50],
  best_vendor: [10, 45, 10, 20, 15],
  fastest:     [15, 10, 40, 30, 5],
};

export function MatchWeightSliders({
  initialPreset,
  initialWeights,
}: MatchWeightSlidersProps) {
  const t = useTranslations("home.matching");
  const [isPending, startTransition] = useTransition();
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [weights, setWeights] = useState(initialWeights);
  const [saved, setSaved] = useState(false);

  const sum =
    weights.proximity +
    weights.rating +
    weights.availability +
    weights.response +
    weights.price;

  const handlePresetChange = (p: Preset) => {
    setPreset(p);
    setSaved(false);
    if (p !== "custom") {
      const [proximity, rating, availability, response, price] = PRESET_WEIGHTS[p];
      setWeights({ proximity, rating, availability, response, price });
    }
  };

  const handleSliderChange = (key: keyof typeof weights, value: number) => {
    setPreset("custom");
    setSaved(false);
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (preset !== "custom" || sum === 100) {
      startTransition(async () => {
        const result = await updateMatchWeights({
          preset,
          custom: preset === "custom" ? weights : undefined,
        });
        if (result.success) setSaved(true);
      });
    }
  };

  const sliderFields: { key: keyof typeof weights; label: string }[] = [
    { key: "proximity", label: t("proximity") },
    { key: "rating", label: t("rating") },
    { key: "availability", label: t("availability") },
    { key: "response", label: t("responseTime") },
    { key: "price", label: t("price") },
  ];

  return (
    <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-1">
        {t("title")}
      </h3>
      <p className="text-sm text-content-tertiary mb-4">{t("description")}</p>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["balanced", "best_price", "best_vendor", "fastest", "custom"] as Preset[]).map(
          (p) => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                preset === p
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
              }`}
            >
              {t(p)}
            </button>
          )
        )}
      </div>

      {/* Sliders */}
      <div className="space-y-4 mb-5">
        {sliderFields.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-content-secondary">{label}</span>
              <span className="text-sm font-medium text-content-primary">
                {weights[key]}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights[key]}
              onChange={(e) =>
                handleSliderChange(key, parseInt(e.target.value, 10))
              }
              className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        ))}
      </div>

      {/* Sum indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-content-tertiary">{t("total")}</span>
        <span
          className={`text-sm font-bold ${
            sum === 100 ? "text-green-500" : "text-red-400"
          }`}
        >
          {sum}%{sum !== 100 && ` (${t("mustEqual100")})`}
        </span>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isPending || (preset === "custom" && sum !== 100)}
        className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t("saving") : saved ? t("saved") : t("savePreferences")}
      </button>
    </div>
  );
}
