/**
 * Route optimization utilities — nearest-neighbor sort, distance/time estimates.
 */

import { haversineDistance } from "./geo-utils";

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteStop extends LatLng {
  id: string;
}

/**
 * Nearest-neighbor sort: given a list of stops, reorder them to minimize
 * total travel distance starting from the first stop.
 * Returns the reordered array of stops.
 */
export function nearestNeighborSort<T extends RouteStop>(stops: T[]): T[] {
  if (stops.length <= 1) return [...stops];

  const result: T[] = [];
  const remaining = [...stops];

  // Start from the first stop
  let current = remaining.shift()!;
  result.push(current);

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    current = remaining.splice(nearestIdx, 1)[0];
    result.push(current);
  }

  return result;
}

/**
 * Calculate total route distance in meters.
 */
export function totalRouteDistance(stops: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineDistance(
      stops[i - 1].lat,
      stops[i - 1].lng,
      stops[i].lat,
      stops[i].lng
    );
  }
  return total;
}

/**
 * Estimate travel time in minutes (assuming avgSpeedMph = 30).
 */
export function estimateTravelMinutes(
  distanceMeters: number,
  avgSpeedMph: number = 30
): number {
  const distanceMiles = distanceMeters / 1609.344;
  return Math.round((distanceMiles / avgSpeedMph) * 60);
}

/**
 * Format total route info for display.
 */
export function formatRouteSummary(stops: LatLng[]): {
  totalMiles: string;
  totalMinutes: number;
} {
  const distM = totalRouteDistance(stops);
  const miles = distM / 1609.344;
  const minutes = estimateTravelMinutes(distM);
  return {
    totalMiles: miles.toFixed(1),
    totalMinutes: minutes,
  };
}
