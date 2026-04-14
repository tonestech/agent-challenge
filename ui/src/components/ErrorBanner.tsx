interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="bg-zinc-900 border border-red-500/50 rounded-lg p-5 mt-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-red-500 font-mono text-lg leading-none pt-0.5">✗</span>
        <div className="flex-1 space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-red-400">
            Scout hit a snag
          </div>
          <div className="font-mono text-sm text-zinc-200 break-words">{message}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-mono uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/50 hover:border-red-400 px-3 py-1.5 rounded-md transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
