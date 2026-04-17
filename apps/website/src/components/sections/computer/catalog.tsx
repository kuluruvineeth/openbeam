"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface CatalogAgent {
  name: string;
  schedule: string;
  description: string;
  details: string[];
}

const AGENTS: CatalogAgent[] = [
  {
    name: "Knowledge Digest",
    schedule: "Weekly \u00b7 Mon 8am",
    description:
      "Summarizes new content across all connectors with trends and gaps.",
    details: [
      "Compares document volume week-over-week",
      "Identifies top sources and notable items",
      "Tracks 12-week rolling averages",
    ],
  },
  {
    name: "Stale Content Detector",
    schedule: "Daily \u00b7 10am",
    description:
      "Finds outdated documents and proposes archival for content not updated in 90+ days.",
    details: [
      "Filters known exclusions from memory",
      "Categorizes by severity (critical, moderate, low)",
      "Proposes archival with approval",
    ],
  },
  {
    name: "Connector Health Monitor",
    schedule: "Every 6 hours",
    description: "Checks sync status and error rates across all connectors.",
    details: [
      "Detects new errors vs baseline",
      "Auto-triggers re-sync for failures",
      "Tracks stale syncs (>12h without update)",
    ],
  },
  {
    name: "Search Quality Analyst",
    schedule: "Weekly \u00b7 Fri 3pm",
    description: "Analyzes search coverage and identifies content gaps.",
    details: [
      "Measures result coverage trends",
      "Flags significant metric changes",
      "Generates actionable recommendations",
    ],
  },
  {
    name: "Onboarding Curator",
    schedule: "On-demand",
    description:
      "Creates personalized reading lists for new team members based on role.",
    details: [
      "Day 1, Week 1, Month 1 progression",
      "Matches documents to role context",
      "Identifies relevant team experts",
    ],
  },
  {
    name: "Compliance Watchdog",
    schedule: "Daily \u00b7 6am",
    description: "Scans for sensitive data exposure and proposes remediation.",
    details: [
      "Searches for passwords, API keys, secrets, tokens",
      "Deduplicates against known findings",
      "Proposes access restrictions for critical items",
    ],
  },
];

function AgentCard({ agent, index }: { agent: CatalogAgent; index: number }) {
  return (
    <motion.div
      className="border border-border/40 p-5"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.08 }}
      viewport={{ once: true, margin: "-40px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-sans text-foreground text-sm">{agent.name}</h3>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
          {agent.schedule}
        </span>
      </div>
      <p className="mb-3 font-sans text-muted-foreground text-xs leading-relaxed">
        {agent.description}
      </p>
      <div className="space-y-1">
        {agent.details.map((detail) => (
          <div
            className="flex items-start gap-2 text-muted-foreground/70 text-xs"
            key={detail}
          >
            <span className="mt-0.5 text-[8px]">&#9671;</span>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function ComputerCatalog() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
            Ready-made agents
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
            Pre-built agents for the workflows that matter most. Enable from the
            catalog — they start running on their next scheduled interval.
          </p>
        </div>

        <div className="grid gap-px sm:grid-cols-2">
          {AGENTS.map((agent, i) => (
            <AgentCard agent={agent} index={i} key={agent.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
