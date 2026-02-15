import { CaptureCard } from "@/components/capture-card";
import type { DDCapture } from "@/lib/types";

interface CaptureGalleryProps {
  captures: DDCapture[];
  projectId: string;
  projectSectionId: string;
  storageBaseUrl: string;
}

export function CaptureGallery({
  captures,
  projectId,
  projectSectionId,
  storageBaseUrl,
}: CaptureGalleryProps) {
  if (captures.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">
          No captures yet. Tap the camera button to start.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
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
