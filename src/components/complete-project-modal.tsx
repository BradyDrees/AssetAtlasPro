"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateProjectStatus } from "@/app/actions/projects";
import { Modal } from "@/components/modal";

interface Warning {
  label: string;
  href: string;
}

interface CompleteProjectModalProps {
  projectId: string;
  warnings: Warning[];
  onClose: () => void;
}

export function CompleteProjectModal({
  projectId,
  warnings,
  onClose,
}: CompleteProjectModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateProjectStatus(projectId, "COMPLETE");
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Failed to complete project:", err);
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t("modals.completeProject.title")}>
      <div className="space-y-4">
        {warnings.length > 0 ? (
          <>
            <p className="text-sm text-content-tertiary">
              {t("modals.completeProject.warningIntro")}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded"
                >
                  <span>⚠</span>
                  <span>{w.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-content-muted">
              {t("modals.completeProject.canStillComplete")}
            </p>
          </>
        ) : (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
            {t("modals.completeProject.allComplete")}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md
                       hover:bg-brand-700 disabled:opacity-50"
          >
            {loading
              ? t("modals.completeProject.completing")
              : warnings.length > 0
              ? t("modals.completeProject.completeAnyway")
              : t("modals.completeProject.completeButton")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
