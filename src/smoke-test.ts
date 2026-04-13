/**
 * Smoke test — calls the service layer directly with BONK's mint.
 *
 * Usage:  bun run src/smoke-test.ts
 *
 * Requires HELIUS_API_KEY or HELIUS_RPC_URL in .env
 */
import "dotenv/config";
import { resolveSymbolToMint } from "./services/tokenRegistry";
import {
  fetchTokenMetadata,
  fetchTopHolders,
  fetchDexScreenerData,
} from "./services/onchain";

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

  const [metadata, holders, dex] = await Promise.allSettled([
    fetchTokenMetadata(BONK_MINT, heliusUrl),
    fetchTopHolders(BONK_MINT, heliusUrl),
    fetchDexScreenerData(BONK_MINT),
  ]);

  console.log("--- Token Metadata ---");
  if (metadata.status === "fulfilled") {
    const m = metadata.value;
    console.log(`  Name: ${m.content.metadata.name}`);
    console.log(`  Symbol: ${m.content.metadata.symbol}`);
    console.log(`  Decimals: ${m.token_info?.decimals}`);
    console.log(`  Mint Authority: ${m.token_info?.mint_authority ?? "REVOKED"}`);
    console.log(`  Freeze Authority: ${m.token_info?.freeze_authority ?? "REVOKED"}`);
  } else {
    console.log(`  ERROR: ${metadata.reason}`);
  }

  console.log("\n--- Holders ---");
  if (holders.status === "fulfilled") {
    console.log(`  Top Holder: ${holders.value.topHolderPercent}%`);
    console.log(`  Top 10: ${holders.value.top10Percent}%`);
  } else {
    console.log(`  ERROR: ${holders.reason}`);
  }

  console.log("\n--- DexScreener ---");
  if (dex.status === "fulfilled" && dex.value) {
    const d = dex.value;
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
    console.log(`  ${dex.status === "fulfilled" ? "No pairs found" : `ERROR: ${(dex as PromiseRejectedResult).reason}`}`);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
