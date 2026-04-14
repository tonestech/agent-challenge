interface Props {
  score: number;
}

interface Band {
  max: number;
  stroke: string;
  text: string;
  label: string;
}

const BANDS: Band[] = [
  { max: 19, stroke: "#10b981", text: "text-emerald-500", label: "CLEAR" },
  { max: 39, stroke: "#60a5fa", text: "text-blue-400", label: "MOSTLY OK" },
  { max: 59, stroke: "#eab308", text: "text-yellow-500", label: "MIXED" },
  { max: 79, stroke: "#f97316", text: "text-orange-500", label: "RISKY" },
  { max: 100, stroke: "#ef4444", text: "text-red-500", label: "DANGER" },
];

function bandFor(score: number): Band {
  const clamped = Math.max(0, Math.min(100, score));
  return BANDS.find((b) => clamped <= b.max) ?? BANDS[BANDS.length - 1];
}

export function RiskGauge({ score }: Props) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const band = bandFor(safeScore);

  // Semicircle arc from (20, 120) -> (220, 120) with radius 100.
  const arcPath = "M 20 120 A 100 100 0 0 1 220 120";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col items-center justify-center">
      <div className="text-xs font-mono uppercase tracking-wider text-amber-400 self-start mb-2">
        Risk Score
      </div>
      <svg viewBox="0 0 240 140" className="w-full max-w-[240px]" aria-label={`Risk score ${safeScore} of 100`}>
        <path
          d={arcPath}
          fill="none"
          stroke="#27272a"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          d={arcPath}
          fill="none"
          stroke={band.stroke}
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${safeScore} 100`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
        <text
          x={120}
          y={108}
          textAnchor="middle"
          className="fill-zinc-50"
          style={{ fontSize: 48, fontFamily: "JetBrains Mono, monospace", fontWeight: 500 }}
        >
          {safeScore}
        </text>
        <text
          x={183}
          y={108}
          textAnchor="start"
          className="fill-zinc-500"
          style={{ fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}
        >
          /100
        </text>
      </svg>
      <div className={`mt-1 font-mono text-sm uppercase tracking-[0.2em] ${band.text}`}>
        {band.label}
      </div>
    </div>
  );
}
