import { useMemo, useState } from "react";
import type { AnalyzeResponse } from "../types";
import { formatAge, shortAddress } from "../lib/format";

interface Props {
  analysis: AnalyzeResponse["analysis"];
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconTwitter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 3.5a1 1 0 0 0-1.04-.14L2.6 11.07a1 1 0 0 0 .06 1.86l4.42 1.53 2.27 6.1a1 1 0 0 0 1.62.38l2.87-2.52 4.64 3.4a1 1 0 0 0 1.58-.6l3.35-16.6a1 1 0 0 0-.47-1.12zM9.8 14.36l-.5 4.27-1.6-4.3 9.3-6.74z" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37A19.8 19.8 0 0 0 16.558 3l-.2.362c-2.16-.33-4.36-.33-6.56 0L9.58 3A19.74 19.74 0 0 0 5.82 4.37C2.56 9.06 1.68 13.62 2.12 18.12A19.9 19.9 0 0 0 7.6 20.9l1.07-1.68a12.9 12.9 0 0 1-2-.96l.5-.37a14 14 0 0 0 11.62 0l.5.37q-.97.57-2 .96l1.07 1.68a19.9 19.9 0 0 0 5.48-2.78c.53-5.22-.88-9.74-3.52-13.75zM8.88 15.33c-1.1 0-2-1.02-2-2.28s.88-2.28 2-2.28 2 1.03 2 2.28-.88 2.28-2 2.28zm6.24 0c-1.1 0-2-1.02-2-2.28s.88-2.28 2-2.28 2 1.03 2 2.28-.88 2.28-2 2.28z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function socialIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("twitter") || t.includes("x")) return <IconTwitter />;
  if (t.includes("telegram")) return <IconTelegram />;
  if (t.includes("discord")) return <IconDiscord />;
  return <IconGlobe />;
}

export function TokenHeader({ analysis }: Props) {
  const { token, ageSeconds, raw } = analysis;
  const ds = raw?.dexScreener;
  const info = ds?.info;
  const [copied, setCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const logoSrc = useMemo(() => {
    if (logoFailed) return null;
    return info?.imageUrl ?? token.logoUri ?? null;
  }, [info?.imageUrl, token.logoUri, logoFailed]);

  const socials = useMemo(() => {
    const list: { url: string; type: string }[] = [];
    if (info?.socials) list.push(...info.socials);
    if (info?.websites) {
      for (const w of info.websites) list.push({ url: w.url, type: w.label || "website" });
    }
    return list;
  }, [info?.socials, info?.websites]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard denied — ignore silently
    }
  }

  const firstLetter = (token.symbol || token.name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {info?.header && (
        <div
          className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${info.header})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-900/80 to-zinc-900" />
        </div>
      )}
      <div className="relative z-10 p-5 space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${token.symbol} logo`}
              width={48}
              height={48}
              className="rounded-full bg-zinc-800 flex-shrink-0"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-300 font-mono text-lg font-medium">
              {firstLetter}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-zinc-50">{token.name || token.symbol}</h2>
              <span className="text-sm font-mono text-zinc-400">${token.symbol}</span>
              {ageSeconds != null && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-700 text-zinc-400">
                  {formatAge(ageSeconds)} old
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 font-mono text-xs text-zinc-400 hover:text-zinc-200 transition"
                title={token.address}
                aria-label="Copy address"
              >
                <span>{shortAddress(token.address)}</span>
                <IconCopy />
              </button>
              {copied && (
                <span className="text-xs font-mono text-emerald-400">copied</span>
              )}
              {ds?.url && (
                <a
                  href={ds.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
                >
                  <span>DexScreener</span>
                  <IconExternal />
                </a>
              )}
            </div>
          </div>
        </div>

        {socials.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-400/50 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-xs font-mono transition-colors"
              >
                {socialIcon(s.type)}
                <span className="capitalize">{s.type}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
