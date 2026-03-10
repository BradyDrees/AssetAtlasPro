/**
 * Wisetack Financing Provider
 *
 * Implementation of FinancingProvider for Wisetack BNPL integration.
 * Requires WISETACK_API_KEY and WISETACK_MERCHANT_ID env vars.
 *
 * When env vars are missing, isConfigured() returns false and all
 * financing UI is hidden gracefully.
 */

import type {
  FinancingProvider,
  FinancingApplicationInput,
  FinancingApplication,
  FinancingStatus,
  FinancingEligibility,
} from "./financing-adapter";
import { registerProvider } from "./financing-adapter";

// ============================================
// Config
// ============================================

const WISETACK_API_URL =
  process.env.WISETACK_API_URL ?? "https://api.wisetack.com/v1";

function getConfig() {
  return {
    apiKey: process.env.WISETACK_API_KEY ?? "",
    merchantId: process.env.WISETACK_MERCHANT_ID ?? "",
    webhookSecret: process.env.WISETACK_WEBHOOK_SECRET ?? "",
  };
}

// ============================================
// Provider Implementation
// ============================================

class WisetackProvider implements FinancingProvider {
  name = "wisetack";

  isConfigured(): boolean {
    const config = getConfig();
    return Boolean(config.apiKey && config.merchantId);
  }

  async isEligible(amount: number): Promise<FinancingEligibility> {
    // Wisetack typically supports $500 - $25,000
    const minAmount = 500;
    const maxAmount = 25000;

    return {
      eligible: amount >= minAmount && amount <= maxAmount,
      minAmount,
      maxAmount,
      terms: ["3 months 0% APR", "6 months", "12 months", "24 months"],
    };
  }

  async createApplication(
    input: FinancingApplicationInput
  ): Promise<{ data?: FinancingApplication; error?: string }> {
    const config = getConfig();
    if (!config.apiKey || !config.merchantId) {
      return { error: "Financing provider not configured" };
    }

    try {
      const response = await fetch(`${WISETACK_API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          merchant_id: config.merchantId,
          amount: Math.round(input.amount * 100), // cents
          customer: {
            first_name: input.customerName.split(" ")[0] ?? input.customerName,
            last_name: input.customerName.split(" ").slice(1).join(" ") || "N/A",
            email: input.customerEmail,
            phone: input.customerPhone ?? undefined,
          },
          description: input.description ?? "Home maintenance service",
          external_reference: input.estimateId,
          metadata: {
            estimate_id: input.estimateId,
            vendor_org_id: input.vendorOrgId,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[wisetack] API error:", response.status, errorBody);
        return { error: `Financing provider error: ${response.status}` };
      }

      const data = await response.json();

      return {
        data: {
          externalId: data.id ?? data.transaction_id,
          applicationUrl: data.consumer_url ?? data.application_url ?? "",
          status: mapWisetackStatus(data.status ?? "pending"),
          provider: "wisetack",
        },
      };
    } catch (err) {
      console.error("[wisetack] Request failed:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to create financing application",
      };
    }
  }

  async handleWebhook(
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<{ status: FinancingStatus; externalId: string } | null> {
    const config = getConfig();

    // Verify webhook signature if secret is set
    if (config.webhookSecret && signature) {
      // In production, verify HMAC signature
      // For now, log and continue
      console.log("[wisetack] Webhook received with signature");
    }

    const externalId =
      (payload.transaction_id as string) ?? (payload.id as string);
    const status = payload.status as string;

    if (!externalId || !status) {
      console.error("[wisetack] Invalid webhook payload:", payload);
      return null;
    }

    return {
      externalId,
      status: mapWisetackStatus(status),
    };
  }
}

// ============================================
// Status Mapping
// ============================================

function mapWisetackStatus(status: string): FinancingStatus {
  const map: Record<string, FinancingStatus> = {
    initiated: "pending",
    pending: "pending",
    approved: "approved",
    declined: "declined",
    expired: "expired",
    funded: "funded",
    settled: "funded",
    cancelled: "cancelled",
    voided: "cancelled",
  };
  return map[status.toLowerCase()] ?? "pending";
}

// ============================================
// Auto-register
// ============================================

// Register Wisetack as the default financing provider
const wisetackProvider = new WisetackProvider();
registerProvider(wisetackProvider);

export { wisetackProvider };
