/**
 * Shared utility for translating DB-driven section/group names.
 * Uses the same nameToKey() pattern as unit-turn checklist items.
 */

/**
 * Convert a raw name to a translation key slug.
 * "Site Drainage & Grading" → "site_drainage__grading"
 */
export function nameToKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()&/,]/g, "")
    .replace(/['']/g, "")
    .replace(/\s+/g, "_");
}

/** Slug-based lookup for DD group names → translation keys */
export const DD_GROUP_KEYS: Record<string, string> = {
  "Site & Exterior": "siteExterior",
  "Mechanical & Infrastructure": "mechanical",
  "Common Areas": "commonAreas",
  "Amenities": "amenities",
  "Units": "units",
};

/** Slug-based lookup for Inspection group names → translation keys */
export const INSPECTION_GROUP_KEYS: Record<string, string> = {
  "Site & Exterior": "siteExterior",
  "Structure": "structure",
  "Life Safety": "lifeSafety",
  "Mechanical / Electrical / Plumbing": "mep",
  "Common Areas": "commonAreas",
  "Units": "units",
};
