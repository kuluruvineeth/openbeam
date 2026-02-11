"use client";

import type { ReactNode } from "react";

type MissionFormContextProps = {
  children: ReactNode;
};

export function MissionFormContext({ children }: MissionFormContextProps) {
  return <div className="flex h-full flex-col">{children}</div>;
}
