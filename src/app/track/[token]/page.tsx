import { getTrackingData } from "./track-actions";
import Image from "next/image";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const { data } = await getTrackingData(token);
  const title = data
    ? `Service Tracking — ${data.vendor_org_name ?? "Asset Atlas"}`
    : "Service Tracking";
  return {
    title,
    description: "Track your service request in real-time.",
    robots: "noindex, nofollow",
  };
}

const STATUS_ORDER = [
  "assigned",
  "accepted",
  "scheduled",
  "en_route",
  "on_site",
  "in_progress",
  "completed",
];

const STATUS_LABELS: Record<string, { en: string; es: string }> = {
  assigned: { en: "Assigned", es: "Asignado" },
  accepted: { en: "Accepted", es: "Aceptado" },
  scheduled: { en: "Scheduled", es: "Programado" },
  en_route: { en: "En Route", es: "En Camino" },
  on_site: { en: "On Site", es: "En Sitio" },
  in_progress: { en: "In Progress", es: "En Progreso" },
  completed: { en: "Completed", es: "Completado" },
};

export default async function TrackingPage({ params }: Props) {
  const { token } = await params;
  const { data } = await getTrackingData(token);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Tracking Link Not Found
          </h1>
          <p className="text-sm text-gray-500">
            This tracking link is invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(data.status);
  const isComplete = data.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${isComplete ? "bg-green-600" : "bg-blue-600"} text-white px-4 py-6`}>
        <div className="max-w-lg mx-auto">
          {data.vendor_org_name && (
            <div className="flex items-center gap-3 mb-3">
              {data.vendor_org_logo && (
                <Image
                  src={data.vendor_org_logo}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full bg-white/20"
                />
              )}
              <div>
                <p className="text-xs text-white/70">Your Service Provider</p>
                <p className="font-semibold">{data.vendor_org_name}</p>
              </div>
            </div>
          )}
          <h1 className="text-xl font-bold">
            {isComplete ? "Service Complete" : "Service In Progress"}
          </h1>
          {data.property_name && (
            <p className="text-sm text-white/80 mt-1">
              {data.property_name}
              {data.unit_number ? ` — ${data.unit_number}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Status Timeline
          </h2>
          <div className="space-y-0">
            {STATUS_ORDER.map((status, idx) => {
              const isReached = idx <= currentIdx;
              const isCurrent = status === data.status;
              const label = STATUS_LABELS[status]?.en ?? status;

              return (
                <div key={status} className="flex items-start gap-3">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isCurrent
                          ? "bg-blue-600 ring-4 ring-blue-100"
                          : isReached
                            ? "bg-green-500"
                            : "bg-gray-200"
                      }`}
                    />
                    {idx < STATUS_ORDER.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${
                          isReached && idx < currentIdx
                            ? "bg-green-300"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className={`pb-6 ${isCurrent ? "-mt-0.5" : "-mt-0.5"}`}>
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-blue-700"
                          : isReached
                            ? "text-green-700"
                            : "text-gray-400"
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Info */}
        {data.scheduled_date && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Scheduled For
            </h2>
            <p className="text-sm text-gray-700">
              {new Date(data.scheduled_date + "T00:00:00").toLocaleDateString(
                undefined,
                { weekday: "long", month: "long", day: "numeric" }
              )}
              {data.scheduled_time_start && (
                <span className="text-gray-500">
                  {" "}at {data.scheduled_time_start}
                  {data.scheduled_time_end ? ` – ${data.scheduled_time_end}` : ""}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Work Description */}
        {data.description && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Service Details
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {data.description}
            </p>
            {data.trade && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {data.trade}
              </span>
            )}
          </div>
        )}

        {/* Completion Photos */}
        {data.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Photos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {data.photos.map((photo, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden">
                  <Image
                    src={photo.signed_url}
                    alt={photo.caption || "Service photo"}
                    width={300}
                    height={200}
                    className="w-full h-32 object-cover"
                  />
                  {photo.caption && (
                    <p className="text-xs text-gray-500 px-1 py-1">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Powered by Asset Atlas Pro
          </p>
        </div>
      </div>
    </div>
  );
}
