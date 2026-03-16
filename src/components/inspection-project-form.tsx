"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createInspectionProject,
  updateInspectionProject,
} from "@/app/actions/inspections";
import {
  INSPECTION_TYPE_LABELS,
  ASSET_ARCHETYPE_LABELS,
  INSPECTION_TYPES_BY_TIER,
  DEFAULT_INSPECTION_TYPE_BY_TIER,
  INSPECTION_BASE_PATH_BY_TIER,
  type InspectionTier,
} from "@/lib/inspection-constants";
import {
  isPcaType,
  type InspectionProject,
  type InspectionType,
  type AssetArchetype,
} from "@/lib/inspection-types";

interface InspectionProjectFormProps {
  project?: InspectionProject;
  onClose: () => void;
  /** Controls which inspection types are available and where to redirect. */
  tier?: InspectionTier;
}

export function InspectionProjectForm({
  project,
  onClose,
  tier = "operate",
}: InspectionProjectFormProps) {
  const allowedTypes = INSPECTION_TYPES_BY_TIER[tier];
  const defaultType = DEFAULT_INSPECTION_TYPE_BY_TIER[tier];

  const [name, setName] = useState(project?.name ?? "");
  const [propertyName, setPropertyName] = useState(
    project?.property_name ?? ""
  );
  const [address, setAddress] = useState(project?.address ?? "");
  const [inspectionType, setInspectionType] = useState<InspectionType>(
    project?.inspection_type ?? defaultType
  );
  const [assetArchetype, setAssetArchetype] = useState<AssetArchetype>(
    project?.asset_archetype ?? "garden"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();
  const router = useRouter();

  const isEditing = !!project;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateInspectionProject(project.id, {
          name,
          property_name: propertyName,
          address,
          inspection_type: inspectionType,
          asset_archetype: assetArchetype,
        });
        onClose();
      } else {
        const result = await createInspectionProject({
          name,
          property_name: propertyName,
          address,
          inspection_type: inspectionType,
          asset_archetype: assetArchetype,
        });
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        onClose();
        router.push(`${INSPECTION_BASE_PATH_BY_TIER[tier]}/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Inspection Type Toggle — only shown if tier has more than one option */}
      {allowedTypes.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-2">
            {t("forms.inspectionType")}
          </label>
          <div className="flex gap-2">
            {allowedTypes.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInspectionType(value)}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  inspectionType === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-primary text-content-secondary border-edge-secondary hover:bg-surface-secondary"
                }`}
              >
                {INSPECTION_TYPE_LABELS[value] ?? value}
              </button>
            ))}
          </div>
          {isPcaType(inspectionType) && (
            <p className="text-xs text-amber-600 mt-1">
              {t("inspection.pcaMode.description")}
            </p>
          )}
        </div>
      )}

      {/* Asset Archetype Toggle */}
      <div>
        <label className="block text-sm font-medium text-content-secondary mb-2">
          {t("forms.assetType")}
        </label>
        <div className="flex gap-2">
          {(Object.entries(ASSET_ARCHETYPE_LABELS) as [AssetArchetype, { label: string; unitLabel: string }][]).map(
            ([value, info]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAssetArchetype(value)}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  assetArchetype === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-primary text-content-secondary border-edge-secondary hover:bg-surface-secondary"
                }`}
              >
                {t(`inspection.archetypes.${value}.label`)}
              </button>
            )
          )}
        </div>
        {assetArchetype === "sfr" && (
          <p className="text-xs text-brand-600 mt-1">
            {t("inspection.pcaMode.sfrNote")}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          {t("forms.projectCode")}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          required
          placeholder={t("forms.placeholders.projectCode")}
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
        />
        <p className="text-xs text-content-quaternary mt-1">
          {t("forms.projectCodeHint")}
        </p>
      </div>

      <div>
        <label
          htmlFor="propertyName"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          {t("forms.propertyName")}
        </label>
        <input
          id="propertyName"
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          required
          placeholder={t("forms.placeholders.propertyName")}
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          {t("forms.address")}
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("forms.placeholders.address")}
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? isEditing
              ? t("forms.savingChanges")
              : t("forms.creating")
            : isEditing
            ? t("forms.saveChanges")
            : t("forms.createInspection")}
        </button>
      </div>
    </form>
  );
}
