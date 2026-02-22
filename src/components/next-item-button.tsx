"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AddSectionItemForm } from "@/components/add-section-item-form";

interface NextItemButtonProps {
  projectId: string;
  projectSectionId: string;
}

export function NextItemButton({
  projectId,
  projectSectionId,
}: NextItemButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const t = useTranslations("common");

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-6 h-14 bg-green-600 text-white
                   rounded-full shadow-lg hover:bg-green-700 active:bg-green-800
                   flex items-center justify-center gap-2
                   transition-colors text-sm font-semibold"
        aria-label={t("addNextItem")}
      >
        {t("nextItem")}
      </button>

      {showForm && (
        <AddSectionItemForm
          projectId={projectId}
          projectSectionId={projectSectionId}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
