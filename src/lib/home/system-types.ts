// ─── Property System Photo types (shared by server actions + client components) ──

export const VALID_SYSTEM_TYPES = [
  "hvac",
  "water_heater",
  "electrical_panel",
  "roof",
  "plumbing",
  "garage_door",
  "pool",
  "sprinkler",
  "other",
] as const;

export type SystemType = (typeof VALID_SYSTEM_TYPES)[number];

export type PropertySystemPhotoRow = {
  id: string;
  property_id: string;
  system_type: SystemType;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  source: "homeowner" | "vendor";
};
