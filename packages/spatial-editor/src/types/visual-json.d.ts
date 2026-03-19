declare module "@visual-json/react" {
  import type { FC, ReactNode } from "react";
  export const VisualJson: FC<{ value: unknown; children?: ReactNode }>;
  export const TreeView: FC<{ showCounts?: boolean }>;
}
