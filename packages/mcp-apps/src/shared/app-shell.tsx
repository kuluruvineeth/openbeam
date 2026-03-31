import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  title?: string;
};

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-border/50 border-b px-3 py-2">
        <svg
          aria-hidden="true"
          className="shrink-0 text-foreground"
          fill="none"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5Z"
            fill="currentColor"
            opacity="0.2"
          />
          <path
            d="M2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <span className="font-medium text-foreground text-xs">
          {title ?? "OpenBeam"}
        </span>
      </header>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
