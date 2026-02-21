"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createDDProject, updateDDProject } from "@/app/actions/projects";
import type { DDProject } from "@/lib/types";

interface DDProjectFormProps {
  project?: DDProject;
  onClose: () => void;
}

export function DDProjectForm({ project, onClose }: DDProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [propertyName, setPropertyName] = useState(
    project?.property_name ?? ""
  );
  const [address, setAddress] = useState(project?.address ?? "");
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
        await updateDDProject(project.id, {
          name,
          property_name: propertyName,
          address,
        });
        onClose();
      } else {
        const projectId = await createDDProject({
          name,
          property_name: propertyName,
          address,
        });
        onClose();
        router.push(`/projects/${projectId}`);
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
            : t("forms.createDueDiligence")}
        </button>
      </div>
    </form>
  );
}
