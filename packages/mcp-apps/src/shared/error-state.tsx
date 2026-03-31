type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
        <svg
          aria-hidden="true"
          className="text-destructive"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M8 5v3m0 2.5h.007M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <span className="font-medium text-sm">Something went wrong</span>
      <span className="max-w-xs text-muted-foreground text-xs">{message}</span>
      {onRetry && (
        <button
          className="mt-1 rounded-sm border border-border/50 px-3 py-1.5 font-medium text-xs transition-colors hover:bg-muted/50"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}
