"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  {
    title: "You describe, it builds",
    description:
      "Tell OpenBeam what you need in plain language. It generates the agent code, picks the right tools, and sets the schedule.",
  },
  {
    title: "Ready-made agents",
    description:
      "Six pre-built agents for knowledge digests, connector health, stale content, search quality, onboarding, and compliance.",
  },
  {
    title: "Runs on your schedule",
    description:
      "Cron-based execution. Weekly summaries on Monday mornings. Health checks every 6 hours. Compliance scans at dawn.",
  },
  {
    title: "Learns over time",
    description:
      "Persistent memory across runs. Agents track baselines, detect trends, and skip noise they've seen before.",
  },
  {
    title: "You stay in control",
    description:
      "Approval mode pauses before acting. Review proposed actions, approve individually, or reject the batch.",
  },
  {
    title: "Access to all your data",
    description:
      "100+ connectors already syncing. Agents search Slack, Notion, Drive, GitHub, Linear — every connected source.",
  },
  {
    title: "Thinks, not just executes",
    description:
      "LLM-powered analysis at every step. Agents categorize, prioritize, summarize, and decide what matters.",
  },
  {
    title: "Secure and isolated",
    description:
      "V8 sandbox with no filesystem or network access. 64MB memory limit. 30-second CPU timeout. Zero attack surface.",
  },
  {
    title: "See everything it does",
    description:
      "Step-by-step traces with full input/output. Every tool call, every LLM generation, every memory write — auditable.",
  },
  {
    title: "Connected to your tools",
    description:
      "MCP integration means agents work in Claude Code, Cursor, and any MCP client. Same tools, every surface.",
  },
  {
    title: "Works wherever you are",
    description:
      "Dashboard, chat, CLI, API, MCP. Trigger a run from Slack. Approve proposals from the terminal. Check status in Claude.",
  },
  {
    title: "Up and running in seconds",
    description:
      "Enable a pre-built agent from the catalog. It starts on its next scheduled run. No code, no config, no deploy.",
  },
];

export function ComputerFeatures() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              className="-ml-[1px] -mt-[1px] border border-border/40 p-5"
              initial={{ opacity: 0, y: 12 }}
              key={feature.title}
              transition={{
                duration: 0.5,
                ease: EASE,
                delay: i * 0.04,
              }}
              viewport={{ once: true, margin: "-40px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-1.5 font-sans text-foreground text-sm">
                {feature.title}
              </h3>
              <p className="font-sans text-muted-foreground text-xs leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
