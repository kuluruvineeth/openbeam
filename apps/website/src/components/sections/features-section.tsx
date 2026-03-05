"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { useCallback } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Feature {
  title: string;
  description: string;
  stat?: string;
  statLabel?: string;
  icon: React.FC;
}

const HERO_FEATURES: [Feature, Feature] = [
  {
    title: "One query. Every tool.",
    description:
      "Slack, Drive, Notion, GitHub, Linear, Gmail — hybrid semantic + keyword search. Results ranked by what you actually work on.",
    stat: "< 200ms",
    statLabel: "p99 across 20+ sources",
    icon: SearchIcon,
  },
  {
    title: "Give it a task, not a query.",
    description:
      "Multi-step agents that search, summarize, draft, and file tickets. Multi-source. Auditable.",
    stat: "6",
    statLabel: "agent patterns",
    icon: AgentIcon,
  },
];

const MID_FEATURES: Feature[] = [
  {
    title: "Pipelines, not prompts.",
    description:
      "LLM, sequential, parallel, loop, generator-critic — six composable patterns. Build what Zapier can't.",
    stat: "6",
    statLabel: "composable patterns",
    icon: WorkflowIcon,
  },
  {
    title: "Connect once. Search forever.",
    description:
      "Slack, Notion, Gmail, GitHub, Linear, Drive. Each connector: full sync, incremental sync, fault-tolerant. Or build your own.",
    stat: "20+",
    statLabel: "connectors",
    icon: ConnectorIcon,
  },
  {
    title: "Yesterday's index is useless.",
    description:
      "Incremental sync catches every change. Full sync rebuilds from scratch. Temporal-backed — retries, idempotency, and fault tolerance built in.",
    stat: "< 5min",
    statLabel: "sync lag",
    icon: SyncIcon,
  },
];

const SMALL_FEATURES: Feature[] = [
  {
    title: "Self-Hosted",
    description: "One command. Your servers, your data, your rules.",
    icon: ServerIcon,
  },
  {
    title: "Edge AI",
    description:
      "SQLite-backed. Offline-capable. On-device RAG with local models.",
    icon: EdgeIcon,
  },
  {
    title: "Video Search",
    description:
      "Find the moment. Transcription, frame analysis, timestamp-level results.",
    icon: VideoIcon,
  },
  {
    title: "Open Source",
    description: "MIT licensed. Fork it, extend it, own it.",
    icon: CodeIcon,
  },
];

function FeatureCard({
  feature,
  className,
  index = 0,
}: {
  feature: Feature;
  className?: string;
  index?: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowBackground = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, hsl(var(--foreground) / 0.04), transparent 70%)`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden border border-border/40 bg-background p-5 transition-colors duration-200 hover:border-border sm:p-6",
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      onMouseMove={handleMouseMove}
      transition={{ delay: index * 0.06, duration: 0.5, ease: EASE }}
      viewport={{ once: true, margin: "-60px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowBackground }}
      />
      <div className="relative">
        <div className="mb-4 flex h-10 w-10 items-center justify-center border border-border bg-card">
          <feature.icon />
        </div>
        <h3 className="font-medium font-sans text-base text-foreground">
          {feature.title}
        </h3>
        <p className="mt-1.5 font-sans text-muted-foreground text-sm leading-relaxed">
          {feature.description}
        </p>
        {feature.stat && (
          <div className="mt-4 border-border/40 border-t pt-4">
            <span className="font-medium font-sans text-2xl text-foreground">
              {feature.stat}
            </span>
            <span className="ml-2 font-sans text-muted-foreground text-xs tracking-wide">
              {feature.statLabel}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section className="bg-background py-16 lg:py-24" id="features">
      <div className="mx-auto max-w-[1400px] px-4">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: EASE }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="mb-3 font-sans text-muted-foreground text-xs uppercase tracking-widest">
            Features
          </p>
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
            The search your tools should have shipped
          </h2>
          <p className="mx-auto mt-3 hidden max-w-xl font-sans text-muted-foreground text-sm leading-relaxed sm:block">
            Connect once. Search everything. Agents close the loop.
          </p>
        </motion.div>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <FeatureCard
                className="h-full"
                feature={HERO_FEATURES[0]}
                index={0}
              />
            </div>
            <div className="lg:col-span-5">
              <FeatureCard
                className="h-full"
                feature={HERO_FEATURES[1]}
                index={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {MID_FEATURES.map((feature, i) => (
              <FeatureCard
                feature={feature}
                index={i + 2}
                key={feature.title}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SMALL_FEATURES.map((feature, i) => (
              <FeatureCard
                feature={feature}
                index={i + 5}
                key={feature.title}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M12 8V4H8" />
      <rect height="12" rx="2" width="16" x="4" y="8" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="6" rx="1" width="6" x="3" y="3" />
      <rect height="6" rx="1" width="6" x="15" y="3" />
      <rect height="6" rx="1" width="6" x="9" y="15" />
      <path d="M6 9v3a1 1 0 0 0 1 1h3" />
      <path d="M18 9v3a1 1 0 0 1-1 1h-3" />
    </svg>
  );
}

function ConnectorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="8" rx="2" ry="2" width="20" x="2" y="2" />
      <rect height="8" rx="2" ry="2" width="20" x="2" y="14" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

function EdgeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="14" rx="2" ry="2" width="18" x="3" y="5" />
      <polygon points="10 9 15 12 10 15 10 9" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
