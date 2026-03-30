import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-border/50 border-b px-3 py-2">
        <span className="font-medium text-muted-foreground text-xs">
          OpenBeam
        </span>
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
