"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { memo } from "react";
import { cn } from "../../../utils";

export interface GhostNodeData {
  toolCallId: string;
  label: string;
  icon?: ReactNode;
  position: { x: number; y: number };
}

export interface GhostNodeOverlayProps {
  ghosts: GhostNodeData[];
}

const GhostNodeContent = memo(function GhostNodeContentComponent({
  ghost,
}: {
  ghost: GhostNodeData;
}) {
  return (
    <div
      className={cn(
        "flex w-80 items-center gap-3 rounded-md border border-primary/30 border-dashed bg-primary/5 p-3",
        "animate-pulse"
      )}
    >
      {ghost.icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
          {ghost.icon}
        </div>
      )}
      <span className="truncate text-muted-foreground text-sm">
        {ghost.label}
      </span>
    </div>
  );
});
GhostNodeContent.displayName = "GhostNodeContent";

export const GhostNodeOverlay = memo(function GhostNodeOverlayComponent({
  ghosts,
}: GhostNodeOverlayProps) {
  return (
    <AnimatePresence>
      {ghosts.map((ghost) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          initial={{ opacity: 0, y: 12 }}
          key={ghost.toolCallId}
          style={{
            position: "absolute",
            left: ghost.position.x,
            top: ghost.position.y,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <GhostNodeContent ghost={ghost} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
});
GhostNodeOverlay.displayName = "GhostNodeOverlay";
