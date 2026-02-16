/**
 * Group display order for Inspection Mode sections.
 * The source of truth is the inspection_sections database table.
 * This constant ensures groups always render in the correct order.
 */
export const INSPECTION_GROUP_ORDER = [
  "Site & Exterior",
  "Structure",
  "Life Safety",
  "Mechanical / Electrical / Plumbing",
  "Common Areas",
  "Units",
] as const;

/**
 * URL-safe slug for each group name.
 * Used in `/inspections/[id]/groups/[groupSlug]` routes.
 */
export const INSPECTION_GROUP_SLUGS: Record<string, string> = {
  "Site & Exterior": "site-exterior",
  "Structure": "structure-envelope",
  "Life Safety": "life-safety",
  "Mechanical / Electrical / Plumbing": "mep",
  "Common Areas": "common-areas",
  "Units": "units",
};

/** Reverse lookup: slug → group name */
export const INSPECTION_SLUG_TO_GROUP: Record<string, string> =
  Object.fromEntries(
    Object.entries(INSPECTION_GROUP_SLUGS).map(([k, v]) => [v, k])
  );
