"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { DDProjectForm } from "@/components/dd-project-form";

export function CreateDDProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("dashboard");

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
      >
        {t("newDD")}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("newDueDiligence")}
      >
        <DDProjectForm onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
