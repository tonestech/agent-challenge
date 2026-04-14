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
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-baseline gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-amber-400 font-medium tracking-widest text-base">
              SCOUT
            </span>
          </div>
          <span className="text-zinc-500 text-xs uppercase tracking-wider">
            Due diligence for Solana tokens
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

      <footer className="max-w-4xl mx-auto px-6 py-8 mt-12 border-t border-zinc-900 text-zinc-600 text-xs font-mono text-center">
        {result && <>Analyzed in {(result.durationMs / 1000).toFixed(1)}s · </>}
        Powered by Nosana · ElizaOS Builders Challenge
      </footer>
    </div>
  );
}
