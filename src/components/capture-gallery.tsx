import { getTranslations } from "next-intl/server";
import { CaptureCard } from "@/components/capture-card";
import type { DDCapture } from "@/lib/types";

interface CaptureGalleryProps {
  captures: DDCapture[];
  projectId: string;
  projectSectionId: string;
  storageBaseUrl: string;
}

export async function CaptureGallery({
  captures,
  projectId,
  projectSectionId,
  storageBaseUrl,
}: CaptureGalleryProps) {
  const t = await getTranslations();
  if (captures.length === 0) {
    return (
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-6 md:p-8 text-center">
        <p className="text-content-quaternary text-sm">
          {t("captures.noPhotos")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {captures.map((capture) => (
        <CaptureCard
          key={capture.id}
          capture={capture}
          projectId={projectId}
          projectSectionId={projectSectionId}
          mediaUrl={`${storageBaseUrl}/storage/v1/object/public/dd-captures/${capture.image_path}`}
        />
      ))}
    </div>
  );
}
