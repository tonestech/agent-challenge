/**
 * Smoke test — calls the service layer directly with BONK's mint,
 * evaluates red flags, synthesizes an LLM verdict, and optionally
 * tests the HTTP endpoint.
 *
 * Usage:  bun run src/smoke-test.ts
 *
 * Requires HELIUS_API_KEY or HELIUS_RPC_URL in .env
 * LLM verdict requires OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_LARGE_MODEL
 */
import "dotenv/config";
import { resolveSymbolToMint } from "./services/tokenRegistry";
import {
  fetchTokenMetadata,
  fetchTopHolders,
  fetchDexScreenerData,
} from "./services/onchain";
import type { TokenAnalysis, HeliusDasAsset, HolderSummary, DexScreenerPair } from "./types/token";
import { evaluateRedFlags } from "./lib/redFlags";
import { synthesizeVerdict } from "./lib/synthesizer";

const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

async function main() {
  const heliusKey = process.env.HELIUS_API_KEY;
  const heliusUrl =
    process.env.HELIUS_RPC_URL ??
    `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;

  if (!heliusKey && !process.env.HELIUS_RPC_URL) {
    console.error("Set HELIUS_API_KEY or HELIUS_RPC_URL in .env");
    process.exit(1);
  }

  console.log("=== Smoke Test: BONK ===\n");

  // 1. Symbol resolution (synchronous, static registry)
  console.log("1. Resolving BONK symbol...");
  const resolved = resolveSymbolToMint("BONK");
  console.log(`   Resolved: ${resolved}`);
  console.log(`   Match: ${resolved === BONK_MINT ? "YES" : "NO"}\n`);

  // 2. Parallel data fetch
  console.log("2. Fetching on-chain + market data in parallel...\n");

  const [metaResult, holdersResult, dexResult] = await Promise.allSettled([
    fetchTokenMetadata(BONK_MINT, heliusUrl),
    fetchTopHolders(BONK_MINT, heliusUrl),
    fetchDexScreenerData(BONK_MINT),
  ]);

  console.log("--- Token Metadata ---");
  if (metaResult.status === "fulfilled") {
    const m = metaResult.value;
    console.log(`  Name: ${m.content.metadata.name}`);
    console.log(`  Symbol: ${m.content.metadata.symbol}`);
    console.log(`  Decimals: ${m.token_info?.decimals}`);
    console.log(`  Mint Authority: ${m.token_info?.mint_authority ?? "REVOKED"}`);
    console.log(`  Freeze Authority: ${m.token_info?.freeze_authority ?? "REVOKED"}`);
  } else {
    console.log(`  ERROR: ${metaResult.reason}`);
  }

  console.log("\n--- Holders ---");
  if (holdersResult.status === "fulfilled") {
    console.log(`  Top Holder: ${holdersResult.value.topHolderPercent}%`);
    console.log(`  Top 10: ${holdersResult.value.top10Percent}%`);
  } else {
    console.log(`  ERROR: ${holdersResult.reason}`);
  }

  console.log("\n--- DexScreener ---");
  if (dexResult.status === "fulfilled" && dexResult.value) {
    const d = dexResult.value;
    console.log(`  Top pair: ${d.dexId} (${d.pairAddress})`);
    console.log(`  Price: $${d.priceUsd ?? "N/A"}`);
    console.log(`  Liquidity: $${d.liquidity?.usd?.toLocaleString() ?? "N/A"}`);
    console.log(`  24h Volume: $${d.volume?.h24?.toLocaleString() ?? "N/A"}`);

    if (d.pairCreatedAt) {
      const ageSeconds = Math.floor((Date.now() - d.pairCreatedAt) / 1000);
      const ageDays = Math.floor(ageSeconds / 86400);
      console.log(`  Pair Created: ${new Date(d.pairCreatedAt).toISOString()}`);
      console.log(`  Age: ${ageDays} days (~${(ageDays / 365).toFixed(1)} years)`);
    } else {
      console.log(`  Pair Created: N/A`);
    }
  } else {
    console.log(`  ${dexResult.status === "fulfilled" ? "No pairs found" : `ERROR: ${(dexResult as PromiseRejectedResult).reason}`}`);
  }

  // 3. Assemble TokenAnalysis + evaluate red flags
  if (metaResult.status === "fulfilled") {
    const metadata: HeliusDasAsset = metaResult.value;
    const holders: HolderSummary =
      holdersResult.status === "fulfilled"
        ? holdersResult.value
        : { topHolderPercent: 0, top10Percent: 0, totalHolders: null };
    const dexData: DexScreenerPair | null =
      dexResult.status === "fulfilled" ? dexResult.value : null;

    const supply = metadata.token_info?.supply ?? 0;
    const decimals = metadata.token_info?.decimals ?? 0;
    const adjustedSupply = decimals > 0 ? supply / Math.pow(10, decimals) : supply;

    let ageSeconds: number | null = null;
    if (dexData?.pairCreatedAt) {
      ageSeconds = Math.floor((Date.now() - dexData.pairCreatedAt) / 1000);
    }

    const analysis: TokenAnalysis = {
      token: {
        address: BONK_MINT,
        name: metadata.content.metadata.name,
        symbol: metadata.content.metadata.symbol,
        decimals,
        supply: adjustedSupply,
        logoUri: metadata.content.links?.image ?? null,
      },
      authorities: {
        mint: metadata.token_info?.mint_authority ?? null,
        freeze: metadata.token_info?.freeze_authority ?? null,
      },
      holders,
      market: {
        priceUsd: dexData?.priceUsd ? parseFloat(dexData.priceUsd) : null,
        liquidityUsd: dexData?.liquidity?.usd ?? null,
        volume24hUsd: dexData?.volume?.h24 ?? null,
      },
      ageSeconds,
      raw: {},
    };

    console.log("\n--- Red Flag Evaluation ---");
    const { flags, riskScore } = evaluateRedFlags(analysis);
    console.log(`  Risk Score: ${riskScore}/100`);
    console.log(`  Flags (${flags.length}):`);
    for (const flag of flags) {
      console.log(`    [${flag.severity}] ${flag.title}`);
      console.log(`      ${flag.description}`);
      console.log(`      Reasoning: ${flag.reasoning}`);
    }

    console.log("\n--- LLM Verdict ---");
    const verdict = await synthesizeVerdict(analysis, flags, riskScore);
    console.log(verdict);
  }

  // 4. HTTP endpoint test (graceful if server not running)
  console.log("\n--- HTTP Endpoint Test ---");
  try {
    const response = await fetch("http://localhost:3000/api/scout/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "BONK" }),
    });
    const data = await response.json();
    console.log(`  Status: ${response.status}`);
    console.log(`  Duration: ${data.durationMs}ms`);
    console.log(`  Risk Score: ${data.riskScore}/100`);
    console.log(`  Flags: ${data.flags?.length ?? 0}`);
    console.log(`  Verdict preview: ${data.verdict?.substring(0, 120)}...`);
  } catch {
    console.log("  HTTP endpoint test skipped — dev server not running");
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
