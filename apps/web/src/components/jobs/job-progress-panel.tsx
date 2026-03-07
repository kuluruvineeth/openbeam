"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { JobProgressItem } from "@/components/jobs/job-progress-item";
import { useActiveJobs, useRunningJobsCount } from "@/stores/job-store";

export function JobProgressPanel() {
  const jobs = useActiveJobs();
  const runningCount = useRunningJobsCount();
  const [isOpen, setIsOpen] = useState(true);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Background jobs"
      className="fixed right-4 bottom-4 z-50 w-80"
    >
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <div className="overflow-hidden border border-border/50 bg-background shadow-sm">
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full cursor-pointer items-center justify-between border-border/40 border-b px-3 py-2 transition-colors hover:bg-muted/50"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground/70 text-xs">
                  Background Jobs
                </span>
                {runningCount > 0 && (
                  <span className="bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary tabular-nums">
                    {runningCount} active
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <Icons.ChevronUp className="text-foreground/40" size={14} />
              </motion.div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.ul
              animate={{ opacity: 1 }}
              className="max-h-80 overflow-y-auto"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AnimatePresence initial={false}>
                {jobs.map((job) => (
                  <motion.li
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                    key={job.id}
                    transition={{ duration: 0.2 }}
                  >
                    <JobProgressItem job={job} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </aside>
  );
}
