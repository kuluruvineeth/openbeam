"use client";

import { motion } from "motion/react";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ComputerCTASection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <motion.div
        className="mx-auto max-w-[1400px] px-4"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: EASE }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div
          className="border border-border p-8 md:p-12"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-60deg, hsla(var(--border), 0.12), hsla(var(--border), 0.12) 1px, transparent 1px, transparent 6px)",
          }}
        >
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
                New
              </span>
              <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
                Introducing Computer
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground text-sm leading-relaxed">
                Autonomous agents that monitor your knowledge base, track
                connector health, surface compliance issues, and deliver
                insights on schedule. Describe what you need — the agent handles
                the rest.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  className="inline-flex h-10 items-center bg-foreground px-5 font-medium text-background text-sm transition-colors hover:bg-foreground/90"
                  href="/computer/"
                >
                  Learn more
                </Link>
                <Link
                  className="inline-flex h-10 items-center border border-border px-5 text-sm transition-colors hover:bg-muted"
                  href="/docs/computer/"
                >
                  Documentation
                </Link>
              </div>
            </div>

            <div className="hidden font-mono text-[11px] text-muted-foreground/50 leading-relaxed lg:block">
              <pre>
                {`  6 pre-built agents
  ─────────────────────
  Knowledge Digest        Weekly · Mon 8am
  Stale Content Detector  Daily · 10am
  Connector Health        Every 6 hours
  Search Quality          Weekly · Fri 3pm
  Onboarding Curator      On-demand
  Compliance Watchdog     Daily · 6am

  5 surfaces
  ─────────────────────
  Dashboard · Chat · CLI · API · MCP`}
              </pre>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
