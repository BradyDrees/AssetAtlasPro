"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { deleteDDProject } from "@/app/actions/projects";
import { Modal } from "@/components/modal";

interface DeleteProjectModalProps {
  projectId: string;
  projectCode: string;
  onClose: () => void;
}

export function DeleteProjectModal({
  projectId,
  projectCode,
  onClose,
}: DeleteProjectModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMatch =
    confirmation.trim().toUpperCase() === projectCode.trim().toUpperCase();

  const handleDelete = async () => {
    if (!isMatch) return;
    setLoading(true);
    setError("");

    try {
      await deleteDDProject(projectId);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError(t("modals.deleteProject.failed"));
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t("modals.deleteProject.title")}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">
            {t("modals.deleteProject.body")}
          </p>
          <p className="text-xs text-red-500 mt-1">{t("modals.deleteProject.cannotUndo")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            {t("modals.deleteProject.typeToConfirm", { code: projectCode })}
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={projectCode}
            className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleDelete}
            disabled={!isMatch || loading}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md
                       hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("modals.deleteProject.deleting") : t("modals.deleteProject.deleteButton")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
