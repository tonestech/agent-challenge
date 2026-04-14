interface Props {
  elapsed: number;
}

const MESSAGES = [
  "Pinging Helius for on-chain truth...",
  "Asking DexScreener about the liquidity story...",
  "Counting whales in the holder pool...",
  "Cross-checking authority revocations...",
  "Scoring red flags...",
  "Asking Scout for his honest opinion...",
  "Drafting verdict (Scout types slowly)...",
  "Almost there — Qwen is thinking...",
];

export function LoadingState({ elapsed }: Props) {
  const idx = Math.floor(elapsed / 4) % MESSAGES.length;
  const message = MESSAGES[idx];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
        </span>
        <span className="font-mono text-sm text-amber-400">
          &gt; scout://investigating · {elapsed.toFixed(1)}s
        </span>
      </div>
      <div className="font-mono text-sm text-zinc-400 min-h-[1.25rem]">{message}</div>

      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <div className="h-40 bg-zinc-800/60 rounded-lg animate-pulse" />
          <div className="h-40 bg-zinc-800/60 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-20 bg-zinc-800/60 rounded-md animate-pulse" />
          <div className="h-20 bg-zinc-800/60 rounded-md animate-pulse" />
          <div className="h-20 bg-zinc-800/60 rounded-md animate-pulse" />
          <div className="h-20 bg-zinc-800/60 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  );
}
