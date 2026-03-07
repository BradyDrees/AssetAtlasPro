export interface VendorScorecardData {
  vendor_org_id: string;
  vendor_name: string;
  avg_rating: number | null;
  total_ratings: number;
  wilson_score: number;
  total_jobs: number;
  monthly_jobs: number;
  on_time_pct: number | null;
  estimate_accuracy_pct: number | null;
  response_time_label: string | null;
  handles_emergency: boolean;
}
