"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";

type ArtifactView = "grid" | "list";

const artifactViewToggleVariants = cva(
  "inline-flex items-center justify-center rounded-sm p-1.5 transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary/10 text-primary",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

type ArtifactViewSwitchProps = {
  view: ArtifactView;
  onViewChange: (view: ArtifactView) => void;
};

export function ArtifactViewSwitch({
  view,
  onViewChange,
}: ArtifactViewSwitchProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-sm border border-border/50 p-0.5">
      <button
        className={artifactViewToggleVariants({ active: view === "grid" })}
        onClick={() => onViewChange("grid")}
        type="button"
      >
        <Icons.LayoutGrid size={14} />
      </button>
      <button
        className={artifactViewToggleVariants({ active: view === "list" })}
        onClick={() => onViewChange("list")}
        type="button"
      >
        <Icons.List size={14} />
      </button>
    </div>
  );
}

export { artifactViewToggleVariants, type ArtifactView };
