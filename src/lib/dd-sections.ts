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
