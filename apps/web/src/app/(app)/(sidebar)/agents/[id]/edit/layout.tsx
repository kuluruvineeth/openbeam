import type { ReactNode } from "react";

interface AgentEditLayoutProps {
  children: ReactNode;
}

export default function AgentEditLayout({ children }: AgentEditLayoutProps) {
  return <div className="flex h-full flex-col">{children}</div>;
}
