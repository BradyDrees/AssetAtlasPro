"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { InspectionProjectForm } from "@/components/inspection-project-form";

export function CreateInspectionButton() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
      >
        {t("inspection.newInspection")}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("inspection.newInspectionTitle")}
      >
        <InspectionProjectForm onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
