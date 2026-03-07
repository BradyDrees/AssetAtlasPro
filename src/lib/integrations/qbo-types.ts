// ============================================
// QuickBooks Online Integration Types
// ============================================

export type IntegrationProvider = "quickbooks" | "xero" | "stripe_connect";

export type SyncDirection = "push" | "pull";
export type SyncStatus = "pending" | "success" | "error" | "skipped";

export interface VendorIntegration {
  id: string;
  vendor_org_id: string;
  provider: IntegrationProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  realm_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SyncLogEntry {
  id: string;
  integration_id: string;
  direction: SyncDirection;
  entity_type: string;
  entity_id: string;
  external_id: string | null;
  status: SyncStatus;
  error_message: string | null;
  created_at: string;
}

/** QBO API invoice line item */
export interface QboLineItem {
  Amount: number;
  Description: string;
  DetailType: "SalesItemLineDetail";
  SalesItemLineDetail: {
    Qty: number;
    UnitPrice: number;
  };
}

/** QBO customer reference */
export interface QboCustomerRef {
  value: string;
  name?: string;
}
