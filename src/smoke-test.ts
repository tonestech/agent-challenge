/**
 * Smoke test — calls the analyzer helper directly with BONK + WIF mints
 * and prints results.
 *
 * Usage:  bun run src/smoke-test.ts
 *
 * Requires HELIUS_API_KEY or HELIUS_RPC_URL in .env
 * LLM verdict requires OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_LARGE_MODEL
 */
import "dotenv/config";
import { resolveSymbolToMint } from "./services/tokenRegistry";
import { analyzeToken } from "./lib/analyzer";

const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const WIF_MINT = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";

async function runOne(query: string, label: string) {
  console.log(`\n=== Smoke Test: ${label} (${query}) ===\n`);
  try {
    const result = await analyzeToken(query);
    const a = result.analysis;
    console.log(`Resolved: ${result.resolvedAddress}`);
    console.log(`Name/Symbol: ${a.token.name} / ${a.token.symbol}`);
    console.log(`Mint Authority: ${a.authorities.mint ?? "REVOKED"}`);
    console.log(`Freeze Authority: ${a.authorities.freeze ?? "REVOKED"}`);
    console.log(`Top Holder: ${a.holders.topHolderPercent ?? "N/A"}%`);
    console.log(`Top 10: ${a.holders.top10Percent ?? "N/A"}%`);
    console.log(`Price: $${a.market.priceUsd ?? "N/A"}`);
    console.log(`Liquidity: $${a.market.liquidityUsd?.toLocaleString() ?? "N/A"}`);
    console.log(`24h Volume: $${a.market.volume24hUsd?.toLocaleString() ?? "N/A"}`);
    if (a.ageSeconds !== null) {
      const days = Math.floor(a.ageSeconds / 86400);
      console.log(`Age: ${days} days`);
    }
    console.log(`\nRisk Score: ${result.riskScore}/100`);
    console.log(`Flags (${result.flags.length}):`);
    for (const flag of result.flags) {
      console.log(`  [${flag.severity}] ${flag.title}`);
      console.log(`    ${flag.description}`);
    }
    console.log(`\n--- Verdict ---`);
    console.log(result.verdict);
    console.log(`\nDuration: ${result.durationMs}ms`);
  } catch (err) {
    console.error(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey && !process.env.HELIUS_RPC_URL) {
    console.error("Set HELIUS_API_KEY or HELIUS_RPC_URL in .env");
    process.exit(1);
  }

  console.log("=== Symbol Resolution ===\n");
  const resolved = resolveSymbolToMint("BONK");
  console.log(`  BONK → ${resolved}`);
  console.log(`  Match: ${resolved === BONK_MINT ? "YES" : "NO"}`);

  await runOne(BONK_MINT, "BONK");
  await runOne(WIF_MINT, "WIF");

  console.log("\n=== Done ===");
}

main().catch(console.error);
