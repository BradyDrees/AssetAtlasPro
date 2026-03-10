"use client";

import { useMemo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";
import dynamic from "next/dynamic";

// Lazy-load Leaflet components — SSR-safe
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

interface ScheduleMapProps {
  jobs: ScheduleJob[];
  date: string;
  onJobClick?: (jobId: string) => void;
  optimizedOrder?: string[]; // ordered job IDs after optimization
}

export function ScheduleMap({
  jobs,
  date,
  onJobClick,
  optimizedOrder,
}: ScheduleMapProps) {
  const t = useTranslations("vendor.schedule");
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      // Fix default icon paths
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setLeafletLoaded(true);
      });
    }
  }, []);

  const dayJobs = useMemo(
    () => jobs.filter((j) => j.scheduled_date === date),
    [jobs, date]
  );

  const mappableJobs = useMemo(
    () => dayJobs.filter((j) => j.property_lat != null && j.property_lng != null),
    [dayJobs]
  );

  // Build route polyline
  const routeCoords = useMemo(() => {
    if (!optimizedOrder || optimizedOrder.length === 0) {
      return mappableJobs.map((j) => [j.property_lat!, j.property_lng!] as [number, number]);
    }
    return optimizedOrder
      .map((id) => mappableJobs.find((j) => j.id === id))
      .filter(Boolean)
      .map((j) => [j!.property_lat!, j!.property_lng!] as [number, number]);
  }, [mappableJobs, optimizedOrder]);

  // Calculate center
  const center = useMemo(() => {
    if (mappableJobs.length === 0) return [39.8283, -98.5795] as [number, number]; // US center
    const avgLat = mappableJobs.reduce((s, j) => s + j.property_lat!, 0) / mappableJobs.length;
    const avgLng = mappableJobs.reduce((s, j) => s + j.property_lng!, 0) / mappableJobs.length;
    return [avgLat, avgLng] as [number, number];
  }, [mappableJobs]);

  if (mappableJobs.length === 0) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-10 h-10 mx-auto mb-2 text-content-quaternary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <p className="text-sm text-content-tertiary">{t("map.noLocations")}</p>
        <p className="text-xs text-content-quaternary mt-1">{t("map.noLocationsHint")}</p>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary h-[400px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappableJobs.map((job, idx) => (
          <Marker key={job.id} position={[job.property_lat!, job.property_lng!]}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{optimizedOrder ? `#${optimizedOrder.indexOf(job.id) + 1} ` : ""}{job.title}</p>
                <p className="text-gray-500">{job.trade}</p>
                {job.scheduled_time_start && (
                  <p className="text-gray-500">
                    {job.scheduled_time_start}{job.scheduled_time_end ? ` – ${job.scheduled_time_end}` : ""}
                  </p>
                )}
                {onJobClick && (
                  <button
                    onClick={() => onJobClick(job.id)}
                    className="mt-1 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    View Job →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#22c55e", weight: 3, dashArray: "8, 4" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
