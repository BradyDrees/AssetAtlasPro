/**
 * Server-side geocoding via Nominatim (OpenStreetMap).
 * Rate limited to 1 request per second.
 * Cache results in-memory to avoid re-geocoding.
 */

"use server";

// In-memory cache (persists during server runtime)
const cache = new Map<string, { lat: number; lng: number } | null>();
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * Geocode an address using Nominatim.
 * Returns { lat, lng } or null if not found.
 * Server-side only — enforces rate limiting.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 5) return null;

  const normalized = address.trim().toLowerCase();
  if (cache.has(normalized)) return cache.get(normalized) ?? null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      cache.set(normalized, null);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      cache.set(normalized, null);
      return null;
    }

    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    cache.set(normalized, result);
    return result;
  } catch {
    cache.set(normalized, null);
    return null;
  }
}
