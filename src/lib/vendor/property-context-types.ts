export interface PropertySystem {
  system_type: string;
  make: string | null;
  model: string | null;
  year_installed: number | null;
  age_years: number | null;
  condition: string | null;
}

export interface PropertyContext {
  property_type: string | null;
  year_built: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  systems: PropertySystem[];
  access_codes: string | null;
  gate_code: string | null;
  lockbox_code: string | null;
  pet_info: string | null;
  parking_notes: string | null;
  past_job_count: number;
}
