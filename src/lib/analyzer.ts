import { PublicKey } from "@solana/web3.js";
import { resolveSymbolToMint } from "../services/tokenRegistry";
import {
  fetchTokenMetadata,
  fetchTopHolders,
  fetchDexScreenerData,
} from "../services/onchain";
import type { TokenAnalysis, HeliusDasAsset, HolderSummary, DexScreenerPair } from "../types/token";
import { evaluateRedFlags, type RedFlag } from "./redFlags";
import { synthesizeVerdict } from "./synthesizer";

export interface AnalysisResult {
  query: string;
  resolvedAddress: string;
  analysis: TokenAnalysis;
  flags: RedFlag[];
  riskScore: number;
  verdict: string;
  durationMs: number;
}

const BASE58_MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function getHeliusUrl(): string {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (rpcUrl) return rpcUrl;
  const apiKey = process.env.HELIUS_API_KEY;
  if (apiKey) return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  throw new Error("Missing HELIUS_API_KEY or HELIUS_RPC_URL in environment");
}

function unwrap<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.warn(`[Scout Analyzer] ${label} failed:`, result.reason);
  return fallback;
}

export async function analyzeToken(query: string): Promise<AnalysisResult> {
  const startMs = Date.now();
  const trimmed = query.trim();

  if (!trimmed) {
    throw new Error("Query is empty");
  }

  let mint: string | null = null;
  if (BASE58_MINT_REGEX.test(trimmed) && isValidPublicKey(trimmed)) {
    mint = trimmed;
  } else {
    mint = resolveSymbolToMint(trimmed);
  }

  if (!mint) {
    throw new Error(`Could not resolve '${trimmed}' — not a known symbol or valid Solana address`);
  }

  const heliusUrl = getHeliusUrl();

  const [metaResult, holdersResult, dexResult] = await Promise.allSettled([
    fetchTokenMetadata(mint, heliusUrl),
    fetchTopHolders(mint, heliusUrl),
    fetchDexScreenerData(mint),
  ]);

  if (metaResult.status === "rejected") {
    throw new Error(`Failed to fetch token metadata: ${String(metaResult.reason)}`);
  }

  const metadata: HeliusDasAsset = metaResult.value;
  const holders: HolderSummary =
    unwrap(holdersResult, null, "holders") ??
    { topHolderPercent: null, top10Percent: null, totalHolders: null };
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

  const { flags, riskScore } = evaluateRedFlags(analysis);
  const verdict = await synthesizeVerdict(analysis, flags, riskScore);

  return {
    query: trimmed,
    resolvedAddress: mint,
    analysis,
    flags,
    riskScore,
    verdict,
    durationMs: Date.now() - startMs,
  };
}
