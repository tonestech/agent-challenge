/**
 * ANALYZE_SOLANA_TOKEN — ElizaOS v2 Action
 *
 * Detects Solana token addresses or symbols in user messages,
 * fetches on-chain + market data, returns a structured TokenAnalysis.
 */
import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionExample,
} from "@elizaos/core";
import { PublicKey } from "@solana/web3.js";
import { resolveSymbolToMint, KNOWN_SYMBOLS } from "../services/tokenRegistry";
import {
  fetchTokenMetadata,
  fetchTopHolders,
  fetchDexScreenerData,
} from "../services/onchain";
import type { TokenAnalysis, HeliusDasAsset, HolderSummary, DexScreenerPair } from "../types/token";

// ── Constants ───────────────────────────────────────────────────────

const BASE58_MINT_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

const SYMBOL_REGEX = new RegExp(`\\b(${KNOWN_SYMBOLS.join("|")})\\b`, "i");

// ── Helpers ─────────────────────────────────────────────────────────

function unwrap<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  label: string,
): T {
  if (result.status === "fulfilled") return result.value;
  console.warn(`[Scout] ${label} failed:`, result.reason);
  return fallback;
}

function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function getHeliusUrl(runtime: IAgentRuntime): string {
  const rpcUrl = runtime.getSetting("HELIUS_RPC_URL");
  if (rpcUrl && typeof rpcUrl === "string") return rpcUrl;

  const apiKey = runtime.getSetting("HELIUS_API_KEY");
  if (apiKey && typeof apiKey === "string") {
    return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }

  throw new Error("Missing HELIUS_API_KEY or HELIUS_RPC_URL in environment");
}

function formatSummary(analysis: TokenAnalysis): string {
  const { token, authorities, holders, market, ageSeconds } = analysis;

  const mintStatus = authorities.mint === null ? "Revoked" : `Active (${authorities.mint})`;
  const freezeStatus = authorities.freeze === null ? "Revoked" : `Active (${authorities.freeze})`;

  const ageDays = ageSeconds !== null ? Math.floor(ageSeconds / 86400) : null;
  const ageStr = ageDays !== null ? `${ageDays} days` : "Unknown";

  const price = market.priceUsd !== null ? `$${market.priceUsd}` : "N/A";
  const liq = market.liquidityUsd !== null
    ? `$${market.liquidityUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : "N/A";
  const vol = market.volume24hUsd !== null
    ? `$${market.volume24hUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : "N/A";

  return [
    `Token: ${token.name} (${token.symbol})`,
    `Address: ${token.address}`,
    `Decimals: ${token.decimals} | Supply: ${token.supply.toLocaleString("en-US")}`,
    ``,
    `Mint Authority: ${mintStatus}`,
    `Freeze Authority: ${freezeStatus}`,
    ``,
    `Top Holder: ${holders.topHolderPercent}%`,
    `Top 10 Holders: ${holders.top10Percent}%`,
    ``,
    `Price: ${price}`,
    `Liquidity: ${liq}`,
    `24h Volume: ${vol}`,
    ``,
    `Token Age: ${ageStr}`,
  ].join("\n");
}

// ── Action ──────────────────────────────────────────────────────────

export const analyzeTokenAction: Action = {
  name: "ANALYZE_SOLANA_TOKEN",
  description:
    "Fetches live on-chain data (Helius) and market data (DexScreener) for a Solana token given a symbol or mint address.",
  similes: [
    "ANALYZE_TOKEN",
    "CHECK_TOKEN",
    "RUG_CHECK",
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<boolean> => {
    const text = message.content?.text ?? "";
    if (!text) return false;
    if (BASE58_MINT_REGEX.test(text)) return true;
    if (SYMBOL_REGEX.test(text)) return true;
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ) => {
    const text = message.content?.text ?? "";

    try {
      // ── 1. Extract mint address ─────────────────────────────────
      let mint: string | null = null;
      let resolvedFrom: "address" | "symbol" | null = null;

      // Try base58 address first
      const addrMatch = text.match(BASE58_MINT_REGEX);
      if (addrMatch && isValidPublicKey(addrMatch[0])) {
        mint = addrMatch[0];
        resolvedFrom = "address";
      }

      // Fall back to symbol resolution
      if (!mint) {
        const symMatch = text.match(SYMBOL_REGEX);
        if (symMatch) {
          const symbol = symMatch[1].toUpperCase();
          mint = resolveSymbolToMint(symbol);
          if (mint) resolvedFrom = "symbol";
        }
      }

      if (!mint) {
        if (callback) {
          await callback({
            text: "I don't recognize that symbol. Try pasting the mint address directly.",
            actions: ["ANALYZE_SOLANA_TOKEN"],
          });
        }
        return { success: false, error: "No valid token address or symbol found" };
      }

      // ── 2. Get Helius URL ─────────────────────────────────────
      const heliusUrl = getHeliusUrl(runtime);

      // ── 3. Parallel fetch ─────────────────────────────────────
      const [metaResult, holdersResult, dexResult] =
        await Promise.allSettled([
          fetchTokenMetadata(mint, heliusUrl),
          fetchTopHolders(mint, heliusUrl),
          fetchDexScreenerData(mint),
        ]);

      // ── 3a. Check if token exists ─────────────────────────────
      if (metaResult.status === "rejected") {
        const errMsg = String(metaResult.reason);
        if (resolvedFrom === "address") {
          if (callback) {
            await callback({
              text: `Address \`${mint}\` is valid base58 but not a recognized SPL token — is this a wallet address or transaction signature? Double-check and try again.`,
              actions: ["ANALYZE_SOLANA_TOKEN"],
            });
          }
          return { success: false, error: `Token not found: ${errMsg}` };
        }
        if (callback) {
          await callback({
            text: `Failed to fetch token metadata for ${mint}: ${errMsg}`,
            actions: ["ANALYZE_SOLANA_TOKEN"],
          });
        }
        return { success: false, error: `Metadata fetch failed: ${errMsg}` };
      }

      // ── 4. Unwrap results ─────────────────────────────────────
      const metadata: HeliusDasAsset = metaResult.value;

      const holders: HolderSummary = unwrap(
        holdersResult,
        { topHolderPercent: 0, top10Percent: 0, totalHolders: null },
        "holders",
      );

      const dexData: DexScreenerPair | null = unwrap(dexResult, null, "dexScreener");

      // ── 5. Assemble TokenAnalysis ─────────────────────────────
      const supply = metadata.token_info?.supply ?? 0;
      const decimals = metadata.token_info?.decimals ?? 0;
      const adjustedSupply = decimals > 0 ? supply / Math.pow(10, decimals) : supply;

      // Age from DexScreener pairCreatedAt (unix ms)
      let ageSeconds: number | null = null;
      if (dexData?.pairCreatedAt) {
        ageSeconds = Math.floor((Date.now() - dexData.pairCreatedAt) / 1000);
      }

      const analysis: TokenAnalysis = {
        token: {
          address: mint,
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
        raw: {
          heliusAsset: metadata,
          holders: holdersResult.status === "fulfilled" ? holdersResult.value : null,
          dexScreener: dexData,
        },
      };

      // ── 6. Respond ────────────────────────────────────────────
      const summary = formatSummary(analysis);

      if (callback) {
        await callback({
          text: summary,
          actions: ["ANALYZE_SOLANA_TOKEN"],
        });
      }

      return {
        success: true,
        text: summary,
        data: analysis as unknown as Record<string, unknown>,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Scout] ANALYZE_SOLANA_TOKEN unexpected error:", err);

      if (callback) {
        await callback({
          text: `Something went wrong while analyzing the token: ${errorMsg}`,
          actions: ["ANALYZE_SOLANA_TOKEN"],
        });
      }

      return { success: false, error: errorMsg };
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "analyze BONK" },
      } as ActionExample,
      {
        name: "Scout",
        content: {
          text: "Pulling live on-chain data for BONK...",
          actions: ["ANALYZE_SOLANA_TOKEN"],
        },
      } as ActionExample,
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "check this token DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
      } as ActionExample,
      {
        name: "Scout",
        content: {
          text: "Running due diligence on that mint...",
          actions: ["ANALYZE_SOLANA_TOKEN"],
        },
      } as ActionExample,
    ],
  ],
};
