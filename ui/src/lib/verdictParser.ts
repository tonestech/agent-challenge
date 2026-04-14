export type SectionKind = "headline" | "good" | "bad" | "vibe";

export interface VerdictSection {
  kind: SectionKind;
  title: string;
  body: string;
  bullets?: string[];
}

const labelMap: Record<string, SectionKind> = {
  Verdict: "headline",
  "The Good": "good",
  "The Bad": "bad",
  "The Vibe": "vibe",
};

export function parseVerdict(raw: string): VerdictSection[] {
  if (!raw) return [];
  const labels = Object.keys(labelMap);
  const pattern = new RegExp(`^(${labels.join("|")}):\\s*`, "gm");
  const matches = [...raw.matchAll(pattern)];
  if (matches.length === 0) {
    return [{ kind: "headline", title: "Verdict", body: raw.trim() }];
  }
  const out: VerdictSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const label = m[1];
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const content = raw.slice(start, end).trim();
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    const bodyLines: string[] = [];
    for (const line of lines) {
      if (/^[*-]\s+/.test(line)) bullets.push(line.replace(/^[*-]\s+/, ""));
      else bodyLines.push(line);
    }
    out.push({
      kind: labelMap[label],
      title: label,
      body: bodyLines.join(" "),
      bullets: bullets.length ? bullets : undefined,
    });
  }
  return out;
}
