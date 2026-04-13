/**
 * Type definitions for ANALYZE_SOLANA_TOKEN action.
 * All external API response shapes + the structured TokenAnalysis output.
 */

// ── Output ──────────────────────────────────────────────────────────

export interface TokenAnalysis {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    supply: number;
    logoUri: string | null;
  };
  authorities: {
    mint: string | null;
    freeze: string | null;
  };
  holders: {
    topHolderPercent: number;
    top10Percent: number;
    totalHolders: number | null;
  };
  market: {
    priceUsd: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;
  };
  ageSeconds: number | null;
  raw: Record<string, unknown>;
}

// ── Helius DAS (getAsset) ───────────────────────────────────────────

export interface HeliusDasAsset {
  id: string;
  content: {
    metadata: { name: string; symbol: string };
    links?: { image?: string };
    json_uri?: string;
  };
  token_info?: {
    decimals: number;
    supply: number;
    mint_authority?: string;
    freeze_authority?: string;
  };
  authorities?: Array<{ address: string; scopes: string[] }>;
}

export interface HeliusRpcResponse<T> {
  jsonrpc: string;
  id: string | number;
  result?: T;
  error?: { code: number; message: string };
}

// ── Standard RPC (token accounts / supply) ──────────────────────────

export interface TokenLargestAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export interface TokenLargestAccountsResult {
  context: { slot: number };
  value: TokenLargestAccount[];
}

export interface TokenSupplyValue {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export interface TokenSupplyResult {
  context: { slot: number };
  value: TokenSupplyValue;
}

// ── DexScreener ─────────────────────────────────────────────────────

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  pairCreatedAt?: number;
}

export interface DexScreenerResponse {
  pairs: DexScreenerPair[] | null;
}

// ── Holder summary (internal) ───────────────────────────────────────

export interface HolderSummary {
  topHolderPercent: number;
  top10Percent: number;
  totalHolders: number | null;
}
