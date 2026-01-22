"use client";

import type { ReactNode } from "react";

type ScrollableContentProps = {
  children: ReactNode;
};

export function ScrollableContent({ children }: ScrollableContentProps) {
  return (
    <div className="scrollbar-hide overflow-y-auto px-8 pb-8">{children}</div>
  );
}
