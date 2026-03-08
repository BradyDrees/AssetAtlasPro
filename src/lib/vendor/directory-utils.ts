// ============================================
// Vendor Directory — Shared Constants & Utilities
// Single source of truth for trade labels, slug helpers, and quality filters.
// ============================================

/** Internal trade key → display label */
export const TRADE_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC / Climate",
  painting: "Painting",
  flooring: "Flooring",
  roofing: "Roofing",
  carpentry: "Carpentry",
  drywall: "Drywall",
  appliance_repair: "Appliance Repair",
  locksmith: "Locksmith",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  cleaning: "Cleaning",
  general_maintenance: "General Maintenance",
  demolition: "Demolition",
  concrete: "Concrete",
  fencing: "Fencing",
  gutters: "Gutters",
  windows_doors: "Windows & Doors",
  fire_safety: "Fire Safety",
};

/** All valid trade keys */
export const TRADE_KEYS = Object.keys(TRADE_LABELS);

/** Slugs that cannot be used as vendor booking slugs */
export const RESERVED_SLUGS = new Set([
  "vendors",
  "book",
  "api",
  "admin",
  "auth",
  "track",
  "pro",
  "vendor",
  "home",
  "app",
  "login",
  "signup",
  "dashboard",
  "settings",
  "profile",
  "terms",
  "privacy",
]);

/** "houston-tx" → { city: "Houston", state: "TX" } */
export function parseCitySlug(slug: string): { city: string; state: string } | null {
  const lastDash = slug.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === slug.length - 1) return null;

  const stateRaw = slug.substring(lastDash + 1);
  const cityRaw = slug.substring(0, lastDash);

  if (stateRaw.length !== 2) return null;

  const city = cityRaw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const state = stateRaw.toUpperCase();

  return { city, state };
}

/** "Houston", "TX" → "houston-tx" */
export function buildCitySlug(city: string, state: string): string {
  return (
    city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    state.toLowerCase()
  );
}

/** Check if a slug is reserved */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
