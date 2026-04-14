/**
 * On-chain data fetching: Helius RPC/DAS + DexScreener.
 */
import type {
  HeliusDasAsset,
  HeliusRpcResponse,
  TokenLargestAccountsResult,
  TokenSupplyResult,
  HolderSummary,
  DexScreenerPair,
  DexScreenerResponse,
} from "../types/token";

const DEXSCREENER_URL = "https://api.dexscreener.com/latest/dex/tokens";
const isDebug = process.env.NODE_ENV !== "production";

// ── RPC helpers ─────────────────────────────────────────────────────

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) {
      u.searchParams.set("api-key", "***");
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  if (isDebug) console.debug(`[RPC] ${method} → ${maskUrl(url)}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (isDebug) console.debug(`[RPC] ${method} status: ${res.status}`);
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);

  const json: HeliusRpcResponse<T> = await res.json();
  if (json.error) {
    throw new Error(`RPC ${method} error: ${json.error.message} (code ${json.error.code})`);
  }
  return json.result as T;
}

/** DAS API uses object params instead of array params. */
async function dasCall<T>(
  url: string,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  if (isDebug) console.debug(`[DAS] ${method} → ${maskUrl(url)}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (isDebug) console.debug(`[DAS] ${method} status: ${res.status}`);
  if (!res.ok) throw new Error(`DAS ${method} HTTP ${res.status}`);

  const json: HeliusRpcResponse<T> = await res.json();
  if (json.error) {
    throw new Error(`DAS ${method} error: ${json.error.message} (code ${json.error.code})`);
  }
  return json.result as T;
}

// ── Public API ──────────────────────────────────────────────────────

export async function fetchTokenMetadata(
  mint: string,
  heliusUrl: string,
): Promise<HeliusDasAsset> {
  return dasCall<HeliusDasAsset>(heliusUrl, "getAsset", { id: mint });
}

export async function fetchTopHolders(
  mint: string,
  heliusUrl: string,
): Promise<HolderSummary | null> {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = [500, 1000, 2000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const [largestAccounts, supply] = await Promise.all([
        rpcCall<TokenLargestAccountsResult>(heliusUrl, "getTokenLargestAccounts", [mint]),
        rpcCall<TokenSupplyResult>(heliusUrl, "getTokenSupply", [mint]),
      ]);

      const totalSupply = supply.value.uiAmount;
      const holders = largestAccounts.value;

      if (!holders.length || totalSupply <= 0) {
        return { topHolderPercent: 0, top10Percent: 0, totalHolders: null };
      }

      // Sort descending by uiAmount
      const sorted = [...holders].sort((a, b) => b.uiAmount - a.uiAmount);

      const topHolderPercent = (sorted[0].uiAmount / totalSupply) * 100;
      const top10 = sorted.slice(0, 10);
      const top10Sum = top10.reduce((sum, h) => sum + h.uiAmount, 0);
      const top10Percent = (top10Sum / totalSupply) * 100;

      return {
        topHolderPercent: Math.round(topHolderPercent * 100) / 100,
        top10Percent: Math.round(top10Percent * 100) / 100,
        totalHolders: null, // standard RPC doesn't return total count
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isOverloaded = msg.includes("code -32603");

      if (isOverloaded && attempt < MAX_RETRIES) {
        const delay = BACKOFF_MS[attempt];
        console.warn(`[Scout] Helius -32603, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Non-retryable error or retries exhausted
      if (isOverloaded) {
        console.warn(`[Scout] Helius -32603 persisted after ${MAX_RETRIES} retries, returning null`);
      } else {
        console.warn(`[Scout] fetchTopHolders failed (non-retryable): ${msg}`);
      }
      return null;
    }
  }

  return null; // unreachable, but satisfies TypeScript
}

export async function fetchDexScreenerData(
  mint: string,
): Promise<DexScreenerPair | null> {
  const url = `${DEXSCREENER_URL}/${mint}`;

  async function doFetch(): Promise<DexScreenerPair | null> {
    if (isDebug) console.debug(`[DexScreener] Fetching: ${url}`);
    const res = await fetch(url);
    if (isDebug) console.debug(`[DexScreener] Response: ${res.status}`);

    if (res.status === 429) throw new Error("rate-limited");
    if (!res.ok) return null;

    const data: DexScreenerResponse = await res.json();
    if (!data.pairs?.length) return null;

    // Return top pair by liquidity
    return [...data.pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];
  }

  try {
    return await doFetch();
  } catch (err) {
    // Single retry on 429
    if (err instanceof Error && err.message === "rate-limited") {
      if (isDebug) console.debug("[DexScreener] Rate limited, retrying in 1s...");
      await new Promise((r) => setTimeout(r, 1000));
      try {
        return await doFetch();
      } catch {
        return null;
      }
    }
    if (isDebug) console.debug("[DexScreener] Fetch failed:", err);
    return null;
  }
}
