export const DOCUMENT_CATEGORIES = [
  "warranty",
  "manual",
  "contract",
  "inspection_report",
  "insurance",
  "permit",
  "receipt",
  "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_SYSTEM_TYPES = [
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
export type DocumentSystemType = (typeof DOCUMENT_SYSTEM_TYPES)[number];

export interface HomeDocument {
  id: string;
  property_id: string;
  category: DocumentCategory;
  name: string;
  description: string | null;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  system_type: DocumentSystemType | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}
