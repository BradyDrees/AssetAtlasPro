// ─── Property Passport Types ─────────────────────────────
// Shared between server actions and client components.
// Kept out of "use server" files (which can only export async fns).

export interface PassportSystemData {
  system: string;
  age: number | null;
  score: number;
  lifespan: number;
  known: boolean;
}

export interface PassportMaintenanceEntry {
  trade: string;
  completedMonth: string; // e.g. "March 2025"
}

export interface PassportSystemPhoto {
  system_type: string;
  photo_url: string;
}

export interface PropertyPassportData {
  // Property details (safe to expose)
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string | null;
  year_built: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;

  // Health score
  overallScore: number;
  grade: string;
  confidence: string;
  systemBreakdown: PassportSystemData[];

  // System photos (public URLs)
  systemPhotos: PassportSystemPhoto[];

  // Maintenance history (trade + month only — no vendor names, no pricing)
  maintenanceHistory: PassportMaintenanceEntry[];
}
