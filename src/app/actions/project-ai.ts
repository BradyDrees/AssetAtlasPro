"use server";

/**
 * AI Trade Breakdown — stub implementation.
 * When ANTHROPIC_API_KEY is configured, this will call Claude Haiku
 * to analyze a project description and produce a trade sequence.
 * For now, returns null so the user manually picks trades.
 */

interface TradeBreakdown {
  trades: Array<{
    order: number;
    trade: string;
    scope: string;
    depends_on: number[];
  }>;
  estimated_duration_days: number;
  estimated_cost_low: number;
  estimated_cost_high: number;
}

export async function analyzeProject(_input: {
  description: string;
}): Promise<{
  success: boolean;
  data?: TradeBreakdown;
  error?: string;
}> {
  // Stub — AI integration deferred until API key is configured
  return {
    success: false,
    error: "AI analysis not yet configured. Please select trades manually or use a template.",
  };
}
