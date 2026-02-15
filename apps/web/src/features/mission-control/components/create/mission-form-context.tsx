"use client";

import type { ReactNode } from "react";

type MissionFormContextProps = {
  children: ReactNode;
};

export function MissionFormContext({ children }: MissionFormContextProps) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
