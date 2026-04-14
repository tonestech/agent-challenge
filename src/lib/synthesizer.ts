/**
 * LLM Synthesizer — calls Nosana's Qwen model for a human-readable verdict.
 */
import type { TokenAnalysis } from "../types/token";
import type { RedFlag } from "./redFlags";

const isDebug = process.env.NODE_ENV !== "production";

const SYSTEM_PROMPT = `You are Scout, a sharp crypto analyst who has seen too many rugs. You give brutally honest verdicts on Solana tokens based on on-chain data. Your voice is slightly sarcastic but never mean. You cite specific numbers. You never give generic financial disclaimers.`;

const USER_PROMPT_TEMPLATE = `Analyze this Solana token:

Name: {name}
Symbol: {symbol}
Address: {address}

MARKET:
- Price: ${"{priceUsd}"}
- Liquidity: ${"{liquidityUsd}"}
- 24h Volume: ${"{volume24hUsd}"}

AUTHORITIES:
- Mint authority: {mintAuthority}
- Freeze authority: {freezeAuthority}

HOLDERS:
- Top holder: {topHolderPercent}%
- Top 10: {top10Percent}%

AGE: {ageDays} days

RED FLAGS DETECTED:
{flagList}

RISK SCORE: {riskScore}/100

Respond with EXACTLY this format (no markdown bold, just plain text):

Verdict: [one-line punchy call]

The Good:
[1-2 sentences, or "Nothing notable" if no positives]

The Bad:
[bullet points, max 4, cite specific numbers]

The Vibe:
[one closing sentence with personality]

Keep total output under 180 words. Don't hedge. No financial advice disclaimers.`;

function buildUserPrompt(
  analysis: TokenAnalysis,
  flags: RedFlag[],
  riskScore: number,
): string {
  const ageDays =
    analysis.ageSeconds !== null
      ? Math.floor(analysis.ageSeconds / 86_400)
      : "Unknown";

  const flagList =
    flags.length > 0
      ? flags
          .map((f) => `[${f.severity}] ${f.title} — ${f.reasoning}`)
          .join("\n")
      : "None detected";

  return USER_PROMPT_TEMPLATE.replace("{name}", analysis.token.name)
    .replace("{symbol}", analysis.token.symbol)
    .replace("{address}", analysis.token.address)
    .replace("{priceUsd}", analysis.market.priceUsd !== null ? `$${analysis.market.priceUsd}` : "N/A")
    .replace("{liquidityUsd}", analysis.market.liquidityUsd !== null ? `$${analysis.market.liquidityUsd.toLocaleString("en-US")}` : "N/A")
    .replace("{volume24hUsd}", analysis.market.volume24hUsd !== null ? `$${analysis.market.volume24hUsd.toLocaleString("en-US")}` : "N/A")
    .replace("{mintAuthority}", analysis.authorities.mint ?? "Revoked")
    .replace("{freezeAuthority}", analysis.authorities.freeze ?? "Revoked")
    .replace("{topHolderPercent}", analysis.holders.topHolderPercent != null ? String(analysis.holders.topHolderPercent) : "N/A")
    .replace("{top10Percent}", analysis.holders.top10Percent != null ? String(analysis.holders.top10Percent) : "N/A")
    .replace("{ageDays}", String(ageDays))
    .replace("{flagList}", flagList)
    .replace("{riskScore}", String(riskScore));
}

function buildFallbackVerdict(flags: RedFlag[], riskScore: number): string {
  if (flags.length === 0) {
    return `Verdict: No red flags detected (Risk Score: ${riskScore}/100)\n\nNo specific issues found in the on-chain data.`;
  }

  const lines = flags.map((f) => `[${f.severity}] ${f.title}: ${f.description}`);
  return `Verdict: Risk Score ${riskScore}/100\n\n${lines.join("\n")}`;
}

/**
 * Qwen3.5 often drafts the final answer inside its reasoning/thinking field
 * but never outputs it as content. This extracts the last complete draft
 * that matches the expected verdict format.
 */
function extractVerdictFromReasoning(reasoning: string): string | null {
  // Look for the last occurrence of "Verdict:" in the reasoning
  // which is typically the model's final polished draft
  const verdictPattern = /Verdict:\s*.+/g;
  const matches = [...reasoning.matchAll(verdictPattern)];
  if (matches.length === 0) return null;

  // Take the last match — the most refined draft
  const lastMatch = matches[matches.length - 1];
  const startIdx = lastMatch.index!;

  // Extract from "Verdict:" to end of reasoning (or until we hit another
  // section that's clearly meta-commentary like "Word Count" or "Constraint Check")
  let extracted = reasoning.substring(startIdx);

  // Trim off meta-commentary that follows the draft
  const metaCutoffs = [
    /\n\s*\*?Word [Cc]ount/,
    /\n\s*\*?Constraint [Cc]heck/,
    /\n\s*\*?Wait,/,
    /\n\s*\*?Let me/,
    /\n\s*\*?I need to/,
    /\n\s*\*?Revised [Dd]raft/,
    /\n\s*\*?Final [Pp]olish/,
  ];

  for (const pattern of metaCutoffs) {
    const cutMatch = extracted.match(pattern);
    if (cutMatch?.index) {
      extracted = extracted.substring(0, cutMatch.index);
    }
  }

  extracted = extracted.trim();

  // Validate it has the expected structure (at least Verdict + one section)
  if (extracted.includes("The Good:") || extracted.includes("The Bad:") || extracted.includes("The Vibe:")) {
    return extracted;
  }

  return null;
}

export async function synthesizeVerdict(
  analysis: TokenAnalysis,
  flags: RedFlag[],
  riskScore: number,
): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_LARGE_MODEL;

  if (!baseUrl || !apiKey || !model) {
    console.warn("[Scout] Missing LLM env vars (OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_LARGE_MODEL), using fallback verdict");
    return buildFallbackVerdict(flags, riskScore);
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const requestBody = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(analysis, flags, riskScore) },
      ],
      max_tokens: 512,
      temperature: 0.7,
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
    };

    if (isDebug) {
      console.debug("[Scout] LLM request body:", JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (isDebug) {
      console.debug(`[Scout] LLM response status: ${response.status}`);
      console.debug("[Scout] LLM response headers:", Object.fromEntries(response.headers.entries()));
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[Scout] LLM returned ${response.status}: ${text}`);
      return buildFallbackVerdict(flags, riskScore);
    }

    const rawBody = await response.text();
    if (isDebug) {
      console.debug("[Scout] LLM raw response body:", rawBody);
    }

    const data = JSON.parse(rawBody) as {
      choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>;
    };

    const choice = data.choices?.[0]?.message;
    const content = choice?.content?.trim();
    if (!content) {
      // Qwen3.5 is a reasoning model — if max_tokens was exhausted on
      // chain-of-thought, content may be null while reasoning has text.
      // Try to extract the verdict from the reasoning field as a fallback.
      if (choice?.reasoning) {
        console.warn("[Scout] LLM content was null but reasoning present — extracting from reasoning");
        const extracted = extractVerdictFromReasoning(choice.reasoning);
        if (extracted) {
          console.log("[Scout] Successfully extracted verdict from reasoning field");
          return extracted;
        }
        if (isDebug) console.debug("[Scout] Could not extract verdict from reasoning, first 500 chars:", choice.reasoning.substring(0, 500));
      }
      console.warn("[Scout] LLM returned empty content");
      return buildFallbackVerdict(flags, riskScore);
    }

    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Scout] LLM call failed: ${msg}`);
    return buildFallbackVerdict(flags, riskScore);
  } finally {
    clearTimeout(timeout);
  }
}
