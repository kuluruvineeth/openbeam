"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const SURFACES = [
  {
    title: "Dashboard",
    description:
      "Enable agents, view run history with step traces, approve proposals with partial selection, edit schedules and modes, browse agent memory.",
  },
  {
    title: "Chat",
    description:
      "Ask about your agents in conversation. Trigger runs, check status, and get notified about findings — all from the AI assistant.",
  },
  {
    title: "CLI",
    description:
      "openbeam computer run <id> --wait. Manage agents, approve proposals, view memory from the terminal. Pipe output to jq.",
  },
  {
    title: "API & MCP",
    description:
      "14 REST endpoints with OpenAPI schemas. 7 MCP tools for Claude Code, Cursor, and any MCP client. tRPC for frontend integrations.",
  },
];

export function ComputerSurfaces() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
            Works wherever you are
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
            Same agents, same data, every surface. Trigger from the dashboard,
            approve from the CLI, check status in Claude Code.
          </p>
        </div>

        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {SURFACES.map((surface, i) => (
            <motion.div
              className="border border-border/40 p-5"
              initial={{ opacity: 0, y: 12 }}
              key={surface.title}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              viewport={{ once: true, margin: "-40px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-2 font-sans text-foreground text-sm">
                {surface.title}
              </h3>
              <p className="font-sans text-muted-foreground text-xs leading-relaxed">
                {surface.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 hidden md:block">
          <InfraDiagram />
        </div>
      </div>
    </section>
  );
}

function InfraDiagram() {
  return (
    <motion.pre
      className="mx-auto max-w-2xl overflow-x-auto rounded-none border border-border/30 bg-[#0a0a0a] p-6 font-mono text-[11px] text-white/50 leading-relaxed"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1 }}
    >
      {`  Dashboard │ Chat │ CLI │ API │ MCP
      ↓        ↓      ↓     ↓     ↓
      └──→ [ describe / trigger / schedule ]
           ↓
      ┌── OpenBeam Computer ──────────────┐
      │ generate · schedule · execute     │
      │ approve  · replay   · notify     │
      └──┬────┬─────┬──────┬─────────────┘
         ↓    ↓     ↓      ↓
       MCP   Memory  Notify  100+
       Tools  Store  System  Connectors`}
    </motion.pre>
  );
}
