export interface MonthlyTrendBucket {
  /** ISO month label, e.g. "2026-03" */
  month: string;
  /** Short display label, e.g. "Mar" */
  label: string;
  avg_rating: number | null;
  review_count: number;
}

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
  /** # homeowner_disputes / # completed WOs (all-time). null if no completed jobs. */
  dispute_rate: number | null;
  /** # WOs with dispute filed within 30d of completion / # completed WOs. null if no completed jobs. */
  callback_rate: number | null;
  /** Last 6 calendar months including current month */
  monthly_trend: MonthlyTrendBucket[];
}
