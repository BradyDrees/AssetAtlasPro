/**
 * Geolocation utilities — haversine distance, on-site detection, formatting.
 */

const EARTH_RADIUS_M = 6_371_000; // meters
const ON_SITE_RADIUS_M = 200; // 200 meters default

/** Haversine distance between two lat/lng pairs (returns meters). */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check if tech is within radius of property. */
export function isOnSite(
  techLat: number,
  techLng: number,
  propertyLat: number,
  propertyLng: number,
  radiusM: number = ON_SITE_RADIUS_M
): boolean {
  return haversineDistance(techLat, techLng, propertyLat, propertyLng) <= radiusM;
}

/** Format distance in human-readable form (miles or feet). */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles >= 0.1) {
    return `${miles.toFixed(1)} mi`;
  }
  const feet = meters * 3.28084;
  return `${Math.round(feet)} ft`;
}

/** Compute is_on_site from tech + property coords. Returns null if either is missing. */
export function computeOnSite(
  techLat: number | null | undefined,
  techLng: number | null | undefined,
  propertyLat: number | null | undefined,
  propertyLng: number | null | undefined
): boolean | null {
  if (
    techLat == null ||
    techLng == null ||
    propertyLat == null ||
    propertyLng == null
  ) {
    return null;
  }
  return isOnSite(techLat, techLng, propertyLat, propertyLng);
}
