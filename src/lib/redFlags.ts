/**
 * Red Flag Evaluator — pure function that scores token risk from on-chain data.
 */
import type { TokenAnalysis } from "../types/token";

export interface RedFlag {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "POSITIVE";
  title: string;
  description: string;
  reasoning: string;
}

export interface RedFlagResult {
  flags: RedFlag[];
  riskScore: number;
}

const SEVERITY_SCORES: Record<RedFlag["severity"], number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  POSITIVE: -15,
};

export function evaluateRedFlags(analysis: TokenAnalysis): RedFlagResult {
  const flags: RedFlag[] = [];

  // ── CRITICAL ────────────────────────────────────────────────────

  if (analysis.authorities.mint !== null) {
    flags.push({
      severity: "CRITICAL",
      title: "Dev can mint unlimited tokens",
      description: "The mint authority has not been revoked. The creator can inflate supply at any time.",
      reasoning: `Mint authority is still active: ${analysis.authorities.mint}`,
    });
  }

  if (analysis.authorities.freeze !== null) {
    flags.push({
      severity: "CRITICAL",
      title: "Dev can freeze your wallet",
      description: "The freeze authority has not been revoked. The creator can freeze any holder's tokens.",
      reasoning: `Freeze authority is still active: ${analysis.authorities.freeze}`,
    });
  }

  if (analysis.market.liquidityUsd !== null && analysis.market.liquidityUsd < 10_000) {
    flags.push({
      severity: "CRITICAL",
      title: "Extremely low liquidity",
      description: "Liquidity is dangerously low. Selling any meaningful amount will crater the price.",
      reasoning: `Liquidity is only $${analysis.market.liquidityUsd.toLocaleString("en-US")} — under $10k threshold`,
    });
  }

  // ── HIGH ────────────────────────────────────────────────────────
  // If data is missing, skip the rule rather than assume safe or unsafe.

  if (analysis.holders.topHolderPercent != null && analysis.holders.topHolderPercent > 30) {
    flags.push({
      severity: "HIGH",
      title: "Extreme holder concentration",
      description: "A single wallet holds over 30% of supply. One sell and the chart is done.",
      reasoning: `Top holder owns ${analysis.holders.topHolderPercent}% of total supply`,
    });
  }

  if (analysis.holders.top10Percent != null && analysis.holders.top10Percent > 60) {
    flags.push({
      severity: "HIGH",
      title: "High concentration among top 10",
      description: "The top 10 wallets control over 60% of supply. Distribution is very poor.",
      reasoning: `Top 10 holders own ${analysis.holders.top10Percent}% of total supply`,
    });
  }

  if (analysis.ageSeconds !== null && analysis.ageSeconds < 86_400) {
    const hours = Math.floor(analysis.ageSeconds / 3600);
    flags.push({
      severity: "HIGH",
      title: "Brand new token (<24h)",
      description: "This token was created less than 24 hours ago. Extremely high risk of rug pull.",
      reasoning: `Token is only ${hours} hours old (${analysis.ageSeconds} seconds)`,
    });
  }

  // ── MEDIUM ──────────────────────────────────────────────────────

  if (
    analysis.market.liquidityUsd !== null &&
    analysis.market.liquidityUsd >= 10_000 &&
    analysis.market.liquidityUsd < 50_000
  ) {
    flags.push({
      severity: "MEDIUM",
      title: "Low liquidity, high slippage",
      description: "Liquidity exists but is thin. Expect significant slippage on larger trades.",
      reasoning: `Liquidity is $${analysis.market.liquidityUsd.toLocaleString("en-US")} — between $10k and $50k`,
    });
  }

  if (analysis.market.volume24hUsd !== null && analysis.market.volume24hUsd < 1_000) {
    flags.push({
      severity: "MEDIUM",
      title: "Very low trading activity",
      description: "Almost no one is trading this token. Getting in is easy, getting out is the problem.",
      reasoning: `24h volume is only $${analysis.market.volume24hUsd.toLocaleString("en-US")}`,
    });
  }

  // ── LOW ─────────────────────────────────────────────────────────

  if (
    analysis.ageSeconds !== null &&
    analysis.ageSeconds >= 86_400 &&
    analysis.ageSeconds < 604_800
  ) {
    const days = Math.floor(analysis.ageSeconds / 86_400);
    flags.push({
      severity: "LOW",
      title: "New token",
      description: "Token is between 1 and 7 days old. Still in the danger zone for rugs.",
      reasoning: `Token is ${days} day${days !== 1 ? "s" : ""} old`,
    });
  }

  // ── POSITIVE ────────────────────────────────────────────────────

  // If data is missing, skip the rule rather than assume safe or unsafe.
  if (
    analysis.authorities.mint === null &&
    analysis.authorities.freeze === null &&
    analysis.market.liquidityUsd !== null &&
    analysis.market.liquidityUsd > 100_000 &&
    analysis.ageSeconds !== null &&
    analysis.ageSeconds > 2_592_000 &&
    analysis.holders.topHolderPercent !== null &&
    analysis.holders.topHolderPercent < 20 &&
    analysis.holders.top10Percent !== null
  ) {
    flags.push({
      severity: "POSITIVE",
      title: "Fundamentals look solid",
      description: "Authorities revoked, good liquidity, mature age, and reasonable distribution.",
      reasoning: `Mint/freeze revoked, $${analysis.market.liquidityUsd.toLocaleString("en-US")} liquidity, ${Math.floor(analysis.ageSeconds / 86_400)} days old, top holder at ${analysis.holders.topHolderPercent}%`,
    });
  }

  // ── Risk score ──────────────────────────────────────────────────

  let riskScore = 0;
  for (const flag of flags) {
    riskScore += SEVERITY_SCORES[flag.severity];
  }
  riskScore = Math.max(0, Math.min(100, riskScore));

  return { flags, riskScore };
}
