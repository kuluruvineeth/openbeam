"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

type CellValue = true | false | "partial" | string;

interface FeatureRow {
  feature: string;
  openbeam: CellValue;
  glean: CellValue;
}

interface CategoryGroup {
  category: string;
  rows: FeatureRow[];
}

const COMPARISON: CategoryGroup[] = [
  {
    category: "Ownership",
    rows: [
      { feature: "License", openbeam: "MIT", glean: "Proprietary" },
      { feature: "Self-Hosted", openbeam: true, glean: false },
      { feature: "Data Sovereignty", openbeam: true, glean: false },
      { feature: "Starting Cost", openbeam: "Free", glean: "$50K+/yr" },
    ],
  },
  {
    category: "Search",
    rows: [
      { feature: "Hybrid Search", openbeam: true, glean: true },
      { feature: "Offline / Edge Search", openbeam: true, glean: false },
      {
        feature: "IoT & Industrial Data",
        openbeam: true,
        glean: false,
      },
      { feature: "RAG Pipeline", openbeam: true, glean: true },
    ],
  },
  {
    category: "Intelligence",
    rows: [
      { feature: "AI Assistant", openbeam: true, glean: true },
      {
        feature: "Agent Framework",
        openbeam: "Open SDK",
        glean: "Proprietary",
      },
      { feature: "Custom Tool Building", openbeam: true, glean: "partial" },
      { feature: "MCP Server", openbeam: true, glean: false },
    ],
  },
  {
    category: "Reach",
    rows: [
      { feature: "SaaS Connectors", openbeam: "20+", glean: "100+" },
      { feature: "Industrial Connectors", openbeam: "10+", glean: false },
      { feature: "Live Sync", openbeam: true, glean: true },
      { feature: "CLI", openbeam: true, glean: false },
      { feature: "Full API", openbeam: true, glean: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-4 w-4 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-3.5 w-3.5 text-muted-foreground/30"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-3.5 w-3.5 text-muted-foreground/50"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function CellContent({
  value,
  isOpenBeam,
}: {
  value: CellValue;
  isOpenBeam?: boolean;
}) {
  if (value === true) {
    return <CheckIcon />;
  }
  if (value === false) {
    return <XIcon />;
  }
  if (value === "partial") {
    return <PartialIcon />;
  }

  return (
    <span
      className={cn(
        "font-sans text-sm",
        isOpenBeam ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}

export function ComparisonSection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: EASE }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="mb-3 font-sans text-muted-foreground text-xs uppercase tracking-widest">
            Trade-offs
          </p>
          <h2 className="font-serif text-2xl text-foreground">
            Same search. Different terms.
          </h2>
          <p className="mx-auto mt-3 max-w-lg font-sans text-muted-foreground text-sm leading-relaxed">
            Enterprise search is a solved problem. The question is who holds the
            keys.
          </p>
        </motion.div>

        <motion.div
          className="scrollbar-hide mx-auto max-w-3xl overflow-x-auto"
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <table className="w-full min-w-[480px] border-collapse font-sans text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background py-4 pr-6 text-left font-normal text-muted-foreground" />
                <th className="relative w-[160px] py-4 text-center">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-foreground" />
                  <span className="font-medium text-foreground">OpenBeam</span>
                </th>
                <th className="w-[160px] py-4 text-center font-normal text-muted-foreground">
                  Glean
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((group) => (
                <>
                  <tr key={group.category}>
                    <td
                      className="sticky left-0 z-10 bg-background pt-8 pb-2 font-sans text-muted-foreground text-xs uppercase tracking-wide"
                      colSpan={3}
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      className="border-border/50 border-b transition-colors hover:bg-muted/30"
                      key={row.feature}
                    >
                      <td className="sticky left-0 z-10 bg-background py-3 pr-6 text-foreground">
                        {row.feature}
                      </td>
                      <td className="bg-foreground/[0.02] py-3 text-center">
                        <CellContent isOpenBeam value={row.openbeam} />
                      </td>
                      <td className="py-3 text-center">
                        <CellContent value={row.glean} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
