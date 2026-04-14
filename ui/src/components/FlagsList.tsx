import type { Flag, Severity } from "../types";

interface Props {
  flags: Flag[];
}

const ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "POSITIVE"];

const STYLES: Record<Severity, { border: string; pill: string; pillText: string }> = {
  CRITICAL: {
    border: "border-l-red-500",
    pill: "bg-red-500/15 border-red-500/40",
    pillText: "text-red-400",
  },
  HIGH: {
    border: "border-l-orange-500",
    pill: "bg-orange-500/15 border-orange-500/40",
    pillText: "text-orange-400",
  },
  MEDIUM: {
    border: "border-l-yellow-500",
    pill: "bg-yellow-500/15 border-yellow-500/40",
    pillText: "text-yellow-400",
  },
  LOW: {
    border: "border-l-blue-400",
    pill: "bg-blue-500/15 border-blue-400/40",
    pillText: "text-blue-400",
  },
  POSITIVE: {
    border: "border-l-emerald-500",
    pill: "bg-emerald-500/15 border-emerald-500/40",
    pillText: "text-emerald-400",
  },
};

export function FlagsList({ flags }: Props) {
  if (!flags || flags.length === 0) return null;

  const sorted = [...flags].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  );

  return (
    <div className="space-y-3">
      <h2 className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-3">
        Signals
      </h2>
      <div className="space-y-3">
        {sorted.map((flag, i) => {
          const s = STYLES[flag.severity] ?? STYLES.LOW;
          return (
            <div
              key={i}
              className={`bg-zinc-900 border border-zinc-800 border-l-4 ${s.border} rounded-lg p-4 space-y-2`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${s.pill} ${s.pillText}`}
                >
                  {flag.severity}
                </span>
                <span className="font-medium text-zinc-100">{flag.title}</span>
              </div>
              {flag.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">{flag.description}</p>
              )}
              {flag.reasoning && (
                <p className="text-xs font-mono text-zinc-500 leading-relaxed">
                  <span className="mr-1">↳</span>
                  {flag.reasoning}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
