import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "./types";
import { analyzeToken } from "./lib/api";
import { TokenInput } from "./components/TokenInput";
import { LoadingState } from "./components/LoadingState";
import { ErrorBanner } from "./components/ErrorBanner";
import { ResultPanel } from "./components/ResultPanel";

type Status = "idle" | "loading" | "success" | "error";

export function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [lastQuery, setLastQuery] = useState<string>("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (status !== "loading") return;
    const id = window.setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [status]);

  async function run(query: string) {
    setLastQuery(query);
    setStatus("loading");
    setError("");
    setResult(null);
    setElapsed(0);
    startedAtRef.current = Date.now();
    try {
      const data = await analyzeToken(query);
      setResult(data);
      setStatus("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <h1 className="font-mono text-xl font-semibold text-amber-400 tracking-tight">
              SCOUT
            </h1>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            due diligence for solana tokens
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <TokenInput onSubmit={run} disabled={status === "loading"} />

        {status === "loading" && <LoadingState elapsed={elapsed} />}
        {status === "error" && (
          <ErrorBanner
            message={error}
            onRetry={() => {
              if (lastQuery) run(lastQuery);
            }}
          />
        )}
        {status === "success" && result && <ResultPanel data={result} />}
      </main>

      <footer className="border-t border-zinc-900 py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-zinc-500">
          <span>
            {result
              ? `Analyzed in ${(result.durationMs / 1000).toFixed(1)}s`
              : "Built for the Nosana + ElizaOS Builders Challenge"}
          </span>
          <span>Powered by Nosana · ElizaOS Builders Challenge</span>
        </div>
      </footer>
    </div>
  );
}
