import { parseVerdict, type VerdictSection } from "../lib/verdictParser";

interface Props {
  verdict: string;
}

function Section({ section }: { section: VerdictSection }) {
  if (section.kind === "headline") {
    return (
      <div className="text-lg font-semibold text-zinc-50 leading-snug">
        <span className="text-amber-400 mr-2">▸</span>
        {section.body}
      </div>
    );
  }

  const styles = {
    good: {
      border: "border-emerald-500",
      title: "text-emerald-400",
      marker: "text-emerald-500",
      glyph: "✓",
    },
    bad: {
      border: "border-red-500",
      title: "text-red-400",
      marker: "text-red-500",
      glyph: "✗",
    },
    vibe: {
      border: "border-amber-400",
      title: "text-amber-400",
      marker: "text-amber-400",
      glyph: "•",
    },
  }[section.kind];

  const italic = section.kind === "vibe" ? "italic text-zinc-300" : "text-zinc-200";

  return (
    <div className={`border-l-2 ${styles.border} pl-4 space-y-2`}>
      <div className={`text-xs font-mono uppercase tracking-wider ${styles.title}`}>
        {section.title}
      </div>
      {section.body && <p className={`text-sm ${italic} leading-relaxed`}>{section.body}</p>}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="text-sm text-zinc-200 flex gap-2 leading-relaxed">
              <span className={`${styles.marker} font-mono flex-shrink-0`}>{styles.glyph}</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VerdictCard({ verdict }: Props) {
  const sections = parseVerdict(verdict);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
      <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
        Scout's Verdict
      </div>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <Section key={i} section={s} />
        ))}
      </div>
    </div>
  );
}
