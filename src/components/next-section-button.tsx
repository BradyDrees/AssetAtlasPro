"use client";

import { useRouter } from "next/navigation";

interface NextSectionButtonProps {
  projectId: string;
  nextSectionId: string;
  nextSectionName: string;
}

export function NextSectionButton({
  projectId,
  nextSectionId,
  nextSectionName,
}: NextSectionButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() =>
        router.push(`/projects/${projectId}/sections/${nextSectionId}`)
      }
      className="fixed bottom-24 left-6 z-40 px-5 h-12 bg-green-600 text-white
                 rounded-full shadow-lg hover:bg-green-700 active:bg-green-800
                 flex items-center justify-center gap-2
                 transition-colors text-sm font-semibold max-w-[200px] truncate"
      aria-label={`Go to next section: ${nextSectionName}`}
    >
      {nextSectionName} &rarr;
    </button>
  );
}
