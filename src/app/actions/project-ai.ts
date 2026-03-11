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

// ─── Home Issue Analysis (F6: AI-Powered Intake) ─────────

interface AiAnalysisInput {
  description?: string;
  /** Base64-encoded images (jpeg/png/webp), max 3, max 1MB each */
  photoBase64s?: string[];
}

interface AiAnalysisResult {
  suggestedTrade: string | null;
  urgencyEstimate: "routine" | "urgent" | "emergency" | null;
  issueDescription: string | null;
  confidence: number; // 0-100
}

const VALID_TRADES = [
  "plumbing", "electrical", "hvac", "appliance", "general",
  "structural", "pest", "cleaning", "landscaping", "roofing",
  "painting", "other",
];

const VALID_URGENCIES = ["routine", "urgent", "emergency"] as const;

/**
 * Analyze a home maintenance issue using Claude Haiku.
 * Returns null if AI is unavailable (graceful degradation).
 * Timeout: 5 seconds. Max 3 photos. Normalize all AI output.
 */
export async function analyzeHomeIssue(
  input: AiAnalysisInput
): Promise<AiAnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  if (!input.description?.trim() && (!input.photoBase64s || input.photoBase64s.length === 0)) {
    return null;
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    // Build content blocks
    const contentBlocks: Array<
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    > = [];

    // Add photos (max 3)
    const photos = (input.photoBase64s ?? []).slice(0, 3);
    for (const base64 of photos) {
      let mediaType = "image/jpeg";
      let data = base64;
      if (base64.startsWith("data:")) {
        const match = base64.match(/^data:(image\/\w+);base64,/);
        if (match) mediaType = match[1];
        data = base64.replace(/^data:image\/\w+;base64,/, "");
      }
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data },
      });
    }

    contentBlocks.push({
      type: "text",
      text: `Analyze this home maintenance issue. ${input.description ? `The homeowner describes: "${input.description}"` : "Look at the photo(s) to identify the issue."}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "trade": "one of: plumbing, electrical, hvac, appliance, general, structural, pest, cleaning, landscaping, roofing, painting, other",
  "urgency": "one of: routine, urgent, emergency",
  "description": "brief 1-2 sentence description of the issue (max 500 chars)",
  "confidence": number 0-100
}`,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await client.messages.create(
      {
        model: "claude-3-5-haiku-latest",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: contentBlocks as Parameters<typeof client.messages.create>[0]["messages"][0]["content"],
          },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize — never bind raw AI response directly to form state
    const trade = VALID_TRADES.includes(parsed.trade) ? parsed.trade : null;
    const urgency = VALID_URGENCIES.includes(parsed.urgency) ? parsed.urgency : null;
    const confidence = typeof parsed.confidence === "number"
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
      : 50;

    let description: string | null = null;
    if (typeof parsed.description === "string") {
      description = parsed.description
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .slice(0, 500)
        .trim() || null;
    }

    return {
      suggestedTrade: trade,
      urgencyEstimate: urgency as AiAnalysisResult["urgencyEstimate"],
      issueDescription: description,
      confidence,
    };
  } catch {
    return null;
  }
}
