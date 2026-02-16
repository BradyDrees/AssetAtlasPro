/**
 * Group display order for consistent rendering.
 * The source of truth is the dd_sections database table.
 * This constant ensures groups always render in the correct order.
 */
export const GROUP_ORDER = [
  "Site & Exterior",
  "Mechanical & Infrastructure",
  "Common Areas",
  "Amenities",
  "Units",
] as const;

/**
 * URL-safe slug for each DD group name.
 * Used for scroll-to-group memory when navigating back to the project page.
 */
export const DD_GROUP_SLUGS: Record<string, string> = {
  "Site & Exterior": "site-exterior",
  "Mechanical & Infrastructure": "mechanical",
  "Common Areas": "common-areas",
  "Amenities": "amenities",
  "Units": "units",
};
