/**
 * LLM Synthesizer — calls Nosana's Qwen model for a human-readable verdict.
 */
import type { TokenAnalysis } from "../types/token";
import type { RedFlag } from "./redFlags";

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
    .replace("{topHolderPercent}", String(analysis.holders.topHolderPercent))
    .replace("{top10Percent}", String(analysis.holders.top10Percent))
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
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(analysis, flags, riskScore) },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[Scout] LLM returned ${response.status}: ${text}`);
      return buildFallbackVerdict(flags, riskScore);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
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
