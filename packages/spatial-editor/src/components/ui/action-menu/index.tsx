"use client";

import { TooltipProvider } from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "./../../../hooks/use-reduced-motion";
import { cn } from "./../../../lib/utils";
import useEditor from "./../../../store/use-editor";
import { ItemCatalog } from "../item-catalog/item-catalog";
import { CameraActions } from "./camera-actions";
import { ControlModes } from "./control-modes";
import { FurnishTools } from "./furnish-tools";
import { StructureTools } from "./structure-tools";
import { ViewToggles } from "./view-toggles";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 28 };

export function ActionMenu({ className }: { className?: string }) {
  const phase = useEditor((state) => state.phase);
  const mode = useEditor((state) => state.mode);
  const tool = useEditor((state) => state.tool);
  const catalogCategory = useEditor((state) => state.catalogCategory);
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : SPRING;

  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          "-translate-x-1/2 fixed bottom-5 left-1/2 z-50",
          "rounded-[20px] border border-[#3b3b36] bg-[#242422] shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
          className
        )}
        layout
        transition={transition}
      >
        <AnimatePresence>
          {mode === "build" && tool === "item" && catalogCategory && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden border-[#3b3b36] border-b px-2"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={transition}
            >
              <div className="py-2">
                <ItemCatalog category={catalogCategory} key={catalogCategory} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "furnish" && mode === "build" && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden border-[#3b3b36] border-b px-2"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={transition}
            >
              <div className="mx-auto w-max py-2">
                <FurnishTools />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "structure" && mode === "build" && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden border-[#3b3b36] border-b px-2"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={transition}
            >
              <div className="w-max py-2">
                <StructureTools />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-1 px-2 py-1.5">
          <ControlModes />
          <div className="mx-1 h-5 w-px bg-[#3b3b36]" />
          <ViewToggles />
          <div className="mx-1 h-5 w-px bg-[#3b3b36]" />
          <CameraActions />
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
