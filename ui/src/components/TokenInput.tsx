import { useState, type KeyboardEvent } from "react";

interface Props {
  onSubmit: (query: string) => void;
  disabled: boolean;
}

const SAMPLES = ["BONK", "WIF", "JUP"];

export function TokenInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function pickSample(sym: string) {
    if (disabled) return;
    setValue(sym);
    onSubmit(sym);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="Paste a Solana mint address or symbol (BONK, WIF, JUP...)"
          className="bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none px-4 py-3 rounded-md font-mono text-sm w-full transition-colors disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="bg-amber-400 text-zinc-950 font-medium px-6 py-3 rounded-md hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Investigate
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <span>Try:</span>
        {SAMPLES.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => pickSample(sym)}
            disabled={disabled}
            className="px-2 py-1 rounded border border-zinc-800 hover:border-amber-400 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
