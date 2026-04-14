import type { AnalyzeResponse } from "../types";
import {
  formatAge,
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
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
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

function isMeaningful(v: string): boolean {
  return v !== "" && v !== "—";
}

export function MetricsGrid({ analysis }: Props) {
  const { token, authorities, holders, market, ageSeconds, raw } = analysis;
  const ds = raw?.dexScreener;

  const cards: Card[] = [];

  // Price + h24 change
  const price = formatPrice(market.priceUsd);
  if (isMeaningful(price)) {
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
  if (isMeaningful(liq)) cards.push({ label: "Liquidity", value: liq });

  const mcap = formatUsd(ds?.marketCap);
  if (isMeaningful(mcap)) cards.push({ label: "Market Cap", value: mcap });

  const vol = formatUsd(market.volume24hUsd);
  if (isMeaningful(vol)) {
    const txns = ds?.txns?.h24;
    const sub = txns ? `${formatNumber(txns.buys)} buys · ${formatNumber(txns.sells)} sells` : undefined;
    cards.push({ label: "24h Volume", value: vol, sub });
  }

  const age = formatAge(ageSeconds);
  if (isMeaningful(age)) {
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
  if (isMeaningful(topHolder)) cards.push({ label: "Top Holder", value: topHolder });

  const top10 = formatPct(holders.top10Percent);
  if (isMeaningful(top10)) cards.push({ label: "Top 10 Holders", value: top10 });

  if (authorities.mint === null) {
    cards.push({ label: "Mint Authority", value: "Revoked", valueClass: "text-emerald-400" });
  } else if (authorities.mint) {
    cards.push({
      label: "Mint Authority",
      value: shortAddress(authorities.mint),
      valueClass: "text-red-400 text-base",
      sub: "Active",
      subClass: "text-red-400 font-mono",
    });
  }

  if (authorities.freeze === null) {
    cards.push({ label: "Freeze Authority", value: "Revoked", valueClass: "text-emerald-400" });
  } else if (authorities.freeze) {
    cards.push({
      label: "Freeze Authority",
      value: shortAddress(authorities.freeze),
      valueClass: "text-red-400 text-base",
      sub: "Active",
      subClass: "text-red-400 font-mono",
    });
  }

  // FDV only if meaningfully different from marketCap
  if (ds?.fdv != null && isFinite(ds.fdv)) {
    const fdvVal = formatUsd(ds.fdv);
    const mcapNum = ds?.marketCap;
    const diffPct =
      mcapNum && mcapNum > 0 ? Math.abs(ds.fdv - mcapNum) / mcapNum : 1;
    if (isMeaningful(fdvVal) && diffPct > 0.05) {
      cards.push({ label: "FDV", value: fdvVal });
    }
  }

  const supply = formatNumber(token.supply);
  if (isMeaningful(supply)) {
    cards.push({ label: "Supply", value: supply, sub: `${token.decimals} decimals` });
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
