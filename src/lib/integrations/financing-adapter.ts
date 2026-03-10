/**
 * Financing Provider Adapter
 *
 * Provider-neutral interface for BNPL / customer financing integrations.
 * Wisetack is the first provider, but this adapter allows swapping.
 *
 * If not configured, financing options are hidden (not errored).
 * Financing logic NEVER bleeds into core estimate approval code.
 */

// ============================================
// Types
// ============================================

export interface FinancingApplicationInput {
  /** Estimate ID the customer wants to finance */
  estimateId: string;
  /** Total amount to finance */
  amount: number;
  /** Customer name */
  customerName: string;
  /** Customer email */
  customerEmail: string;
  /** Customer phone */
  customerPhone?: string;
  /** Description of the work */
  description?: string;
  /** Vendor organization ID */
  vendorOrgId: string;
}

export interface FinancingApplication {
  /** External application ID from the financing provider */
  externalId: string;
  /** URL to redirect the customer to complete the application */
  applicationUrl: string;
  /** Current status */
  status: FinancingStatus;
  /** Provider name */
  provider: string;
}

export type FinancingStatus =
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "funded"
  | "cancelled";

export interface FinancingEligibility {
  eligible: boolean;
  minAmount: number;
  maxAmount: number;
  terms: string[];
}

// ============================================
// Provider Interface
// ============================================

export interface FinancingProvider {
  /** Provider identifier */
  name: string;

  /** Check if the provider is configured (has required env vars) */
  isConfigured(): boolean;

  /** Check if a given amount is eligible for financing */
  isEligible(amount: number): Promise<FinancingEligibility>;

  /** Create a financing application */
  createApplication(
    input: FinancingApplicationInput
  ): Promise<{ data?: FinancingApplication; error?: string }>;

  /** Handle webhook from the provider */
  handleWebhook(
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<{ status: FinancingStatus; externalId: string } | null>;
}

// ============================================
// Registry
// ============================================

let activeProvider: FinancingProvider | null = null;

/**
 * Register a financing provider.
 */
export function registerProvider(provider: FinancingProvider): void {
  activeProvider = provider;
}

/**
 * Get the active financing provider. Returns null if none configured.
 */
export function getFinancingProvider(): FinancingProvider | null {
  if (activeProvider && activeProvider.isConfigured()) {
    return activeProvider;
  }
  return null;
}

/**
 * Check if any financing provider is available.
 */
export function isFinancingAvailable(): boolean {
  return activeProvider !== null && activeProvider.isConfigured();
}
