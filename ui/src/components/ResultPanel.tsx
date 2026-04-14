import type { AnalyzeResponse } from "../types";
import { TokenHeader } from "./TokenHeader";
import { RiskGauge } from "./RiskGauge";
import { VerdictCard } from "./VerdictCard";
import { FlagsList } from "./FlagsList";
import { MetricsGrid } from "./MetricsGrid";

interface Props {
  data: AnalyzeResponse;
}

export function ResultPanel({ data }: Props) {
  return (
    <div className="mt-6 space-y-6">
      <TokenHeader analysis={data.analysis} />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <RiskGauge score={data.riskScore} />
        <VerdictCard verdict={data.verdict} />
      </div>
      <FlagsList flags={data.flags} />
      <div>
        <h2 className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-3">
          On-chain metrics
        </h2>
        <MetricsGrid analysis={data.analysis} />
      </div>
    </div>
  );
}
