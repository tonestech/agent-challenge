import type { ReactNode } from "react";
import type { AnalyzeResponse } from "../types";
import {
  formatAge,
  formatLargeCount,
  formatNumber,
  formatPct,
  formatPrice,
  formatUsd,
  shortAddress,
} from "../lib/format";

interface Props {
  analysis: AnalyzeResponse["analysis"];
}

interface Card {
  label: string;
  value: ReactNode;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWarningTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2L14.5 13.5H1.5L8 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5V9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function Cell({ card }: { card: Card }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {card.label}
      </div>
      <div
        className={`font-mono text-xl mt-1 ${card.valueClass ?? "text-zinc-50"}`}
      >
        {card.value}
      </div>
      {card.sub && (
        <div className={`text-xs mt-1 ${card.subClass ?? "text-zinc-500"}`}>{card.sub}</div>
      )}
    </div>
  );
}

function isMeaningfulString(v: string): boolean {
  return v !== "" && v !== "—";
}

export function MetricsGrid({ analysis }: Props) {
  const { token, authorities, holders, market, ageSeconds, raw } = analysis;
  const ds = raw?.dexScreener;

  const cards: Card[] = [];

  // Price + h24 change
  const price = formatPrice(market.priceUsd);
  if (isMeaningfulString(price)) {
    const change = ds?.priceChange?.h24;
    let sub: string | undefined;
    let subClass: string | undefined;
    if (change != null && isFinite(change)) {
      const arrow = change >= 0 ? "▲" : "▼";
      sub = `${arrow} ${Math.abs(change).toFixed(2)}% 24h`;
      subClass = change >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono";
    }
    cards.push({ label: "Price", value: price, sub, subClass });
  }

  const liq = formatUsd(market.liquidityUsd);
  if (isMeaningfulString(liq)) cards.push({ label: "Liquidity", value: liq });

  const mcap = formatUsd(ds?.marketCap);
  if (isMeaningfulString(mcap)) cards.push({ label: "Market Cap", value: mcap });

  const vol = formatUsd(market.volume24hUsd);
  if (isMeaningfulString(vol)) {
    const txns = ds?.txns?.h24;
    const sub = txns ? `${formatNumber(txns.buys)} buys · ${formatNumber(txns.sells)} sells` : undefined;
    cards.push({ label: "24h Volume", value: vol, sub });
  }

  const age = formatAge(ageSeconds);
  if (isMeaningfulString(age)) {
    let sub: string | undefined;
    if (ds?.pairCreatedAt) {
      const d = new Date(ds.pairCreatedAt);
      if (!isNaN(d.getTime())) {
        sub = `since ${d.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
      }
    }
    cards.push({ label: "Age", value: age, sub });
  }

  const topHolder = formatPct(holders.topHolderPercent);
  if (isMeaningfulString(topHolder)) cards.push({ label: "Top Holder", value: topHolder });

  const top10 = formatPct(holders.top10Percent);
  if (isMeaningfulString(top10)) cards.push({ label: "Top 10 Holders", value: top10 });

  if (authorities.mint === null) {
    cards.push({
      label: "Mint Authority",
      value: (
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <IconCheck />
          Revoked
        </span>
      ),
    });
  } else if (authorities.mint) {
    cards.push({
      label: "Mint Authority",
      value: (
        <span className="inline-flex items-center gap-1.5 text-red-400 text-base">
          <IconWarningTriangle />
          {shortAddress(authorities.mint)}
        </span>
      ),
      sub: "ACTIVE — holder can mint",
      subClass: "text-red-400 font-mono",
    });
  }

  if (authorities.freeze === null) {
    cards.push({
      label: "Freeze Authority",
      value: (
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <IconCheck />
          Revoked
        </span>
      ),
    });
  } else if (authorities.freeze) {
    cards.push({
      label: "Freeze Authority",
      value: (
        <span className="inline-flex items-center gap-1.5 text-red-400 text-base">
          <IconWarningTriangle />
          {shortAddress(authorities.freeze)}
        </span>
      ),
      sub: "ACTIVE — holder can freeze",
      subClass: "text-red-400 font-mono",
    });
  }

  // FDV only if meaningfully different from marketCap
  if (ds?.fdv != null && isFinite(ds.fdv)) {
    const fdvVal = formatUsd(ds.fdv);
    const mcapNum = ds?.marketCap;
    const diffPct =
      mcapNum && mcapNum > 0 ? Math.abs(ds.fdv - mcapNum) / mcapNum : 1;
    if (isMeaningfulString(fdvVal) && diffPct > 0.05) {
      cards.push({ label: "FDV", value: fdvVal });
    }
  }

  const supply = formatLargeCount(token.supply);
  if (isMeaningfulString(supply)) {
    cards.push({
      label: "Supply",
      value: supply,
      sub: `${token.symbol} · ${token.decimals} decimals`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Cell key={i} card={c} />
      ))}
    </div>
  );
}
