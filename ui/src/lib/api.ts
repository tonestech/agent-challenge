import type { AnalyzeResponse, AnalyzeError } from "../types";

export async function analyzeToken(query: string): Promise<AnalyzeResponse> {
  const res = await fetch("/api/scout/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    let err: AnalyzeError;
    try {
      err = await res.json();
    } catch {
      err = { error: `HTTP ${res.status}`, code: "UNKNOWN" };
    }
    throw new Error(err.error);
  }
  return res.json();
}
