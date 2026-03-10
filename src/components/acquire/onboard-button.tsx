"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { OnboardPropertyModal } from "./onboard-property-modal";

interface OnboardButtonProps {
  projectId: string;
  projectName: string;
  projectAddress: string;
  isComplete: boolean;
}

export function OnboardButton({
  projectId,
  projectName,
  projectAddress,
  isComplete,
}: OnboardButtonProps) {
  const t = useTranslations("review");
  const [showModal, setShowModal] = useState(false);

  if (!isComplete) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-5 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        {t("onboardToOperate")}
      </button>

      {showModal && (
        <OnboardPropertyModal
          projectId={projectId}
          projectName={projectName}
          projectAddress={projectAddress}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
