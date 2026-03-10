"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { clockIn, clockOut } from "@/app/actions/vendor-work-orders";
import type { VendorWoTimeEntry } from "@/lib/vendor/work-order-types";

interface GpsClockProps {
  workOrderId: string;
  openEntry: VendorWoTimeEntry | null;
  propertyLat?: number | null;
  propertyLng?: number | null;
  onMutate?: () => void | Promise<void>;
}

interface GeoState {
  lat: number | null;
  lng: number | null;
  status: "idle" | "requesting" | "acquired" | "denied" | "unavailable";
  distanceM: number | null;
  isOnSite: boolean | null;
}

export function GpsClock({
  workOrderId,
  openEntry,
  propertyLat,
  propertyLng,
  onMutate,
}: GpsClockProps) {
  const t = useTranslations("vendor.jobs");
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lng: null,
    status: "idle",
    distanceM: null,
    isOnSite: null,
  });

  const isClockedIn = !!openEntry;

  // Haversine distance (client-side for display only)
  const haversine = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    []
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo((prev) => ({ ...prev, status: "unavailable" }));
      return;
    }
    setGeo((prev) => ({ ...prev, status: "requesting" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let distanceM: number | null = null;
        let isOnSiteVal: boolean | null = null;
        if (propertyLat != null && propertyLng != null) {
          distanceM = haversine(lat, lng, propertyLat, propertyLng);
          isOnSiteVal = distanceM <= 200;
        }
        setGeo({ lat, lng, status: "acquired", distanceM, isOnSite: isOnSiteVal });
      },
      () => {
        setGeo((prev) => ({ ...prev, status: "denied" }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [propertyLat, propertyLng, haversine]);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const formatDist = (meters: number): string => {
    const miles = meters / 1609.344;
    if (miles >= 0.1) return `${miles.toFixed(1)} mi`;
    return `${Math.round(meters * 3.28084)} ft`;
  };

  async function handleClockIn() {
    // Grab fresh location before clock-in
    setLoading(true);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {
      // GPS denied/unavailable — proceed without coords
    }

    const { error } = await clockIn({
      work_order_id: workOrderId,
      lat,
      lng,
    });
    setLoading(false);
    if (error) {
      alert(error);
    } else {
      onMutate?.();
    }
  }

  async function handleClockOut() {
    setLoading(true);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {
      // GPS denied/unavailable — proceed without coords
    }

    const { error } = await clockOut(workOrderId, undefined, lat, lng);
    setLoading(false);
    if (error) {
      alert(error);
    } else {
      onMutate?.();
    }
  }

  // Location status badge
  const locationBadge = () => {
    if (geo.status === "requesting") {
      return (
        <span className="text-[10px] text-content-quaternary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {t("time.gps.requesting")}
        </span>
      );
    }
    if (geo.status === "denied" || geo.status === "unavailable") {
      return (
        <span className="text-[10px] text-content-quaternary flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {t("time.gps.unavailable")}
        </span>
      );
    }
    if (geo.status === "acquired") {
      if (geo.isOnSite === true) {
        return (
          <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("time.gps.onSite")} ({formatDist(geo.distanceM!)})
          </span>
        );
      }
      if (geo.isOnSite === false) {
        return (
          <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {t("time.gps.offSite")} ({formatDist(geo.distanceM!)})
          </span>
        );
      }
      // Acquired but no property coords
      return (
        <span className="text-[10px] text-content-quaternary flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {t("time.gps.noPropertyLocation")}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      {/* Location status */}
      <div className="flex items-center justify-between">
        {locationBadge()}
        {geo.status !== "requesting" && geo.status !== "acquired" && (
          <button
            onClick={requestLocation}
            className="text-[10px] text-brand-400 hover:text-brand-300"
          >
            {t("time.gps.retry")}
          </button>
        )}
      </div>

      {/* Clock In/Out Button */}
      {isClockedIn ? (
        <button
          onClick={handleClockOut}
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          {loading ? "..." : t("time.clockOut")}
        </button>
      ) : (
        <button
          onClick={handleClockIn}
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
        >
          {loading ? "..." : t("time.clockIn")}
        </button>
      )}
    </div>
  );
}
