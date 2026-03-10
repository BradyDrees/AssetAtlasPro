"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { logSystemInfo } from "@/app/actions/vendor-property-context";
import { VALID_SYSTEM_TYPES, type SystemType } from "@/lib/home/system-types";

interface SystemInfoFormProps {
  woId: string;
  onSuccess?: () => void;
}

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  hvac: "HVAC",
  water_heater: "Water Heater",
  electrical_panel: "Electrical Panel",
  roof: "Roof",
  plumbing: "Plumbing",
  garage_door: "Garage Door",
  pool: "Pool",
  sprinkler: "Sprinkler",
  other: "Other",
};

/** Expected lifespan in years — used for age warnings */
const LIFESPAN: Record<string, number> = {
  hvac: 17,
  water_heater: 10,
  electrical_panel: 32,
  roof: 25,
  plumbing: 50,
  garage_door: 20,
  pool: 25,
  sprinkler: 20,
  other: 20,
};

function compressPhoto(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SystemInfoForm({ woId, onSuccess }: SystemInfoFormProps) {
  const t = useTranslations("vendor.jobs.systemInfo");
  const [isPending, startTransition] = useTransition();
  const [systemType, setSystemType] = useState<SystemType>("hvac");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [age, setAge] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const lifespan = LIFESPAN[systemType] ?? 20;
  const ageNum = age ? parseInt(age) : null;
  const ageWarning = ageNum != null && ageNum > lifespan;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
      const compressed = await compressPhoto(files[i]);
      newPhotos.push(compressed);
    }
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await logSystemInfo({
        woId,
        systemType,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        serial: serial.trim() || undefined,
        age: ageNum ?? undefined,
        photos: photos.length > 0 ? photos : undefined,
      });
      if (result.success) {
        setSuccess(true);
        setMake("");
        setModel("");
        setSerial("");
        setAge("");
        setPhotos([]);
        onSuccess?.();
      } else {
        setError(result.error ?? "Failed to save");
      }
    });
  };

  if (success) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
        <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm font-medium text-green-400">{t("saved")}</p>
        <button
          onClick={() => setSuccess(false)}
          className="text-xs text-content-quaternary mt-2 hover:text-content-primary"
        >
          {t("addAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* System type */}
      <div>
        <label className="text-xs font-medium text-content-tertiary mb-1 block">{t("systemType")}</label>
        <select
          value={systemType}
          onChange={(e) => setSystemType(e.target.value as SystemType)}
          className="w-full rounded-lg border border-edge-secondary bg-surface-secondary text-content-primary text-sm px-3 py-2"
        >
          {VALID_SYSTEM_TYPES.map((st) => (
            <option key={st} value={st}>{SYSTEM_TYPE_LABELS[st] ?? st}</option>
          ))}
        </select>
      </div>

      {/* Make / Model row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-content-tertiary mb-1 block">{t("make")}</label>
          <input
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder={t("makePlaceholder")}
            className="w-full rounded-lg border border-edge-secondary bg-surface-secondary text-content-primary text-sm px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-content-tertiary mb-1 block">{t("model")}</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t("modelPlaceholder")}
            className="w-full rounded-lg border border-edge-secondary bg-surface-secondary text-content-primary text-sm px-3 py-2"
          />
        </div>
      </div>

      {/* Serial / Age row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-content-tertiary mb-1 block">{t("serial")}</label>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder={t("serialPlaceholder")}
            className="w-full rounded-lg border border-edge-secondary bg-surface-secondary text-content-primary text-sm px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-content-tertiary mb-1 block">{t("age")}</label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-edge-secondary bg-surface-secondary text-content-primary text-sm px-3 py-2"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-content-quaternary">{t("years")}</span>
          </div>
          {ageWarning && (
            <p className="text-[10px] text-amber-400 mt-0.5">
              {t("ageWarning", { lifespan })}
            </p>
          )}
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="text-xs font-medium text-content-tertiary mb-1 block">
          {t("photos")} ({photos.length}/5)
        </label>
        {photos.length > 0 && (
          <div className="grid grid-cols-5 gap-1 mb-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded overflow-hidden">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-0 right-0 bg-black/60 text-white w-4 h-4 flex items-center justify-center text-[10px] rounded-bl"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 5 && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-2 rounded-lg border border-dashed border-edge-secondary text-xs text-content-quaternary hover:text-content-primary hover:border-edge-primary transition-colors"
          >
            {t("addPhoto")}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isPending || (!make && !model && !serial && !age && photos.length === 0)}
        className="w-full py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </div>
  );
}
