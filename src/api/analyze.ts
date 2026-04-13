/**
 * POST /api/scout/analyze — HTTP endpoint for token analysis.
 *
 * Registered as an ElizaOS plugin route (no sidecar server needed).
 * The plugin route handler matches any path globally when no agentId
 * query param is present, so this is accessible at the root server port.
 */
import type { Route, RouteRequest, RouteResponse, IAgentRuntime } from "@elizaos/core";
import { PublicKey } from "@solana/web3.js";
import { resolveSymbolToMint } from "../services/tokenRegistry";
import {
  fetchTokenMetadata,
  fetchTopHolders,
  fetchDexScreenerData,
} from "../services/onchain";
import type { TokenAnalysis, HeliusDasAsset, HolderSummary, DexScreenerPair } from "../types/token";
import { evaluateRedFlags } from "../lib/redFlags";
import { synthesizeVerdict } from "../lib/synthesizer";

// ── Helpers ─────────────────────────────────────────────────────────

const BASE58_MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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

function setCorsHeaders(res: RouteResponse): void {
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader?.("Access-Control-Allow-Headers", "Content-Type");
}

function unwrap<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  label: string,
): T {
  if (result.status === "fulfilled") return result.value;
  console.warn(`[Scout API] ${label} failed:`, result.reason);
  return fallback;
}

// ── CORS Preflight ──────────────────────────────────────────────────

export const analyzeOptionsRoute: Route = {
  type: "OPTIONS" as Route["type"],
  path: "/api/scout/analyze",
  handler: async (_req: RouteRequest, res: RouteResponse) => {
    setCorsHeaders(res);
    res.status(204).end();
  },
};

// ── POST Handler ────────────────────────────────────────────────────

export const analyzeRoute: Route = {
  type: "POST",
  path: "/api/scout/analyze",
  handler: async (req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) => {
    setCorsHeaders(res);
    const startMs = Date.now();

    try {
      // ── 1. Parse & validate query ─────────────────────────────
      const body = req.body as { query?: string } | undefined;
      const query = body?.query?.trim();

      if (!query) {
        res.status(400).json({ error: "Missing 'query' in request body", code: "MISSING_QUERY" });
        return;
      }

      // ── 2. Resolve address ────────────────────────────────────
      let mint: string | null = null;

      if (BASE58_MINT_REGEX.test(query) && isValidPublicKey(query)) {
        mint = query;
      } else {
        mint = resolveSymbolToMint(query);
      }

      if (!mint) {
        res.status(404).json({
          error: `Could not resolve '${query}' — not a known symbol or valid Solana address`,
          code: "UNKNOWN_TOKEN",
        });
        return;
      }

      // ── 3. Get Helius URL ─────────────────────────────────────
      const heliusUrl = getHeliusUrl(runtime);

      // ── 4. Parallel data fetch ────────────────────────────────
      const [metaResult, holdersResult, dexResult] = await Promise.allSettled([
        fetchTokenMetadata(mint, heliusUrl),
        fetchTopHolders(mint, heliusUrl),
        fetchDexScreenerData(mint),
      ]);

      if (metaResult.status === "rejected") {
        res.status(500).json({
          error: `Failed to fetch token metadata: ${String(metaResult.reason)}`,
          code: "METADATA_FETCH_FAILED",
        });
        return;
      }

      // ── 5. Assemble TokenAnalysis ─────────────────────────────
      const metadata: HeliusDasAsset = metaResult.value;
      const holders: HolderSummary = unwrap(
        holdersResult,
        { topHolderPercent: 0, top10Percent: 0, totalHolders: null },
        "holders",
      );
      const dexData: DexScreenerPair | null = unwrap(dexResult, null, "dexScreener");

      const supply = metadata.token_info?.supply ?? 0;
      const decimals = metadata.token_info?.decimals ?? 0;
      const adjustedSupply = decimals > 0 ? supply / Math.pow(10, decimals) : supply;

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

      // ── 6. Red flags ──────────────────────────────────────────
      const { flags, riskScore } = evaluateRedFlags(analysis);

      // ── 7. LLM verdict ────────────────────────────────────────
      const verdict = await synthesizeVerdict(analysis, flags, riskScore);

      // ── 8. Respond ────────────────────────────────────────────
      const durationMs = Date.now() - startMs;

      res.status(200).json({
        query,
        resolvedAddress: mint,
        analysis,
        flags,
        riskScore,
        verdict,
        durationMs,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Scout API] Unexpected error:", err);
      res.status(500).json({ error: errorMsg, code: "INTERNAL_ERROR" });
    }
  },
};
