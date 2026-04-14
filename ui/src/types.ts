export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "POSITIVE";

export interface Flag {
  severity: Severity;
  title: string;
  description: string;
  reasoning: string;
}

export interface DexInfo {
  imageUrl?: string;
  header?: string;
  websites?: { url: string; label: string }[];
  socials?: { url: string; type: string }[];
}

export interface DexScreener {
  url?: string;
  priceChange?: { h1?: number; h6?: number; h24?: number };
  txns?: Record<string, { buys: number; sells: number }>;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: DexInfo;
}

export interface AnalyzeResponse {
  query: string;
  resolvedAddress: string;
  analysis: {
    token: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      supply: number;
      logoUri?: string | null;
    };
    authorities: { mint: string | null; freeze: string | null };
    holders: {
      topHolderPercent: number | null;
      top10Percent: number | null;
      totalHolders: number | null;
    };
    market: {
      priceUsd: number | null;
      liquidityUsd: number | null;
      volume24hUsd: number | null;
    };
    ageSeconds: number | null;
    raw?: { dexScreener?: DexScreener; heliusAsset?: unknown; holders?: unknown };
  };
  flags: Flag[];
  riskScore: number;
  verdict: string;
  durationMs: number;
}

export interface AnalyzeError {
  error: string;
  code: string;
}
