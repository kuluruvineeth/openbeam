"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const TYPING_SPEED = 35;
const SPINNER_SPEED = 80;
const CURSOR_BLINK = 530;
const RESULT_PAUSE = 1800;

const ORA_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type Phase =
  | "idle"
  | "typing-1"
  | "spin-1"
  | "result-1"
  | "typing-2"
  | "spin-2"
  | "result-2"
  | "done";

interface Scenario {
  label: string;
  cmd1: string;
  spin1: string;
  result1: string[];
  cmd2: string;
  spin2: string;
  result2: string[];
}

const SCENARIOS: Scenario[] = [
  {
    label: "Create",
    cmd1: 'openbeam computer generate --description "Monitor connector health and auto-fix sync failures"',
    spin1: "Generating agent plan...",
    result1: [
      "  Name: Connector Health Monitor",
      "  Slug: connector-health-monitor",
      "  Schedule: 0 */6 * * *",
      "  Tools: connector_list, connector_health, sync_trigger",
      "",
      "  Plan:",
      "    1. Fetch all connectors",
      "    2. Check health and sync status",
      "    3. Compare against baseline",
      "    4. Auto-trigger re-sync for failures",
      "    5. Notify on new issues",
    ],
    cmd2: "openbeam computer enable --template-id connector-health-monitor",
    spin2: "Enabling agent...",
    result2: [
      '  Agent "Connector Health Monitor" enabled.',
      "  Status: active",
      "  Next run: in 6 hours",
    ],
  },
  {
    label: "Run",
    cmd1: "openbeam computer run connector-health --wait",
    spin1: "Running agent...",
    result1: [
      "  [2s] status: running",
      "  [8s] status: running",
      "  [14s] status: completed",
      "",
      "  Connector issues:",
      "  - Linear: sync stale (last: 18h ago)",
      "  - Notion: new error",
      "",
      "  Auto-triggered re-sync for Notion.",
    ],
    cmd2: "openbeam computer runs connector-health",
    spin2: "Fetching run history...",
    result2: [
      "  completed   3 tools  2m ago   All 12 connectors healthy",
      "  completed   5 tools  6h ago   1 issue: Notion sync error",
      "  failed      2 tools  12h ago  stale_timeout",
    ],
  },
  {
    label: "Approve",
    cmd1: "openbeam computer proposals stale-content run_abc123",
    spin1: "Fetching proposals...",
    result1: [
      "  3 proposed actions (awaiting approval):",
      "",
      "  [0] context_store",
      '      Archive: "Q3 Engineering Handbook (2024)"',
      "  [1] context_store",
      '      Archive: "Legacy API Migration Guide"',
      "  [2] context_store",
      '      Archive: "Old Onboarding Checklist"',
    ],
    cmd2: "openbeam computer approve stale-content run_abc123 --pick 0,1",
    spin2: "Approving actions...",
    result2: ["  Approved 2 of 3 actions.", "  Run resumed."],
  },
  {
    label: "Memory",
    cmd1: "openbeam computer memory knowledge-digest",
    spin1: "Fetching memory...",
    result1: [
      "  weekly_volume  (snapshot)",
      '  {"docCount":847,"sources":["SLACK","NOTION","DRIVE"]}',
      "  Updated: 2h ago",
      "",
      "  weekly_trends  (trends)",
      "  [12 entries, rolling 3-month window]",
      "  Updated: 2h ago",
    ],
    cmd2: "openbeam computer runs knowledge-digest --limit 3",
    spin2: "Fetching runs...",
    result2: [
      "  completed   4 tools  2h ago   847 docs this week (+12%)",
      "  completed   4 tools  7d ago   756 docs last week",
      "  completed   3 tools  14d ago  801 docs",
    ],
  },
];

function useTerminalAnimation(scenario: Scenario) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [charIndex, setCharIndex] = useState(0);
  const [spinFrame, setSpinFrame] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setCharIndex(0);
    setSpinFrame(0);
  }, []);

  useEffect(() => {
    reset();
    const start = setTimeout(() => setPhase("typing-1"), 600);
    return () => clearTimeout(start);
  }, [scenario, reset]);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), CURSOR_BLINK);
    return () => clearInterval(blink);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    switch (phase) {
      case "typing-1":
      case "typing-2": {
        const cmd = phase === "typing-1" ? scenario.cmd1 : scenario.cmd2;
        if (charIndex < cmd.length) {
          timerRef.current = setTimeout(
            () => setCharIndex((c) => c + 1),
            TYPING_SPEED
          );
        } else {
          timerRef.current = setTimeout(() => {
            setCharIndex(0);
            setSpinFrame(0);
            setPhase(phase === "typing-1" ? "spin-1" : "spin-2");
          }, 300);
        }
        break;
      }
      case "spin-1":
      case "spin-2": {
        if (spinFrame < 12) {
          timerRef.current = setTimeout(() => {
            setSpinFrame((f) => f + 1);
          }, SPINNER_SPEED);
        } else {
          timerRef.current = setTimeout(() => {
            setPhase(phase === "spin-1" ? "result-1" : "result-2");
          }, 200);
        }
        break;
      }
      case "result-1":
        timerRef.current = setTimeout(() => {
          setCharIndex(0);
          setPhase("typing-2");
        }, RESULT_PAUSE);
        break;
      case "result-2":
        timerRef.current = setTimeout(() => setPhase("done"), RESULT_PAUSE);
        break;
      case "done":
        timerRef.current = setTimeout(reset, 3000);
        timerRef.current = setTimeout(() => setPhase("typing-1"), 3200);
        break;
      default:
        break;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [phase, charIndex, spinFrame, scenario, reset]);

  return { phase, charIndex, spinFrame, cursorVisible };
}

function Terminal() {
  const [activeTab, setActiveTab] = useState(0);
  const scenario = SCENARIOS[activeTab];
  const { phase, charIndex, spinFrame, cursorVisible } =
    useTerminalAnimation(scenario);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [phase, charIndex]);

  const showCmd1 =
    phase === "typing-1" ||
    phase === "spin-1" ||
    phase === "result-1" ||
    phase === "typing-2" ||
    phase === "spin-2" ||
    phase === "result-2" ||
    phase === "done";
  const showSpin1 =
    phase === "spin-1" ||
    phase === "result-1" ||
    phase === "typing-2" ||
    phase === "spin-2" ||
    phase === "result-2" ||
    phase === "done";
  const showResult1 =
    phase === "result-1" ||
    phase === "typing-2" ||
    phase === "spin-2" ||
    phase === "result-2" ||
    phase === "done";
  const showCmd2 =
    phase === "typing-2" ||
    phase === "spin-2" ||
    phase === "result-2" ||
    phase === "done";
  const showSpin2 =
    phase === "spin-2" || phase === "result-2" || phase === "done";
  const showResult2 = phase === "result-2" || phase === "done";

  return (
    <div className="flex h-[420px] flex-col overflow-hidden border border-border/50 bg-[#0a0a0a] md:h-[480px]">
      <div className="flex items-center gap-2 border-white/[0.06] border-b px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex gap-1">
          {SCENARIOS.map((s, i) => (
            <button
              className={cn(
                "px-2.5 py-1 font-mono text-[11px] transition-colors",
                activeTab === i
                  ? "bg-white/10 text-white/80"
                  : "text-white/30 hover:text-white/50"
              )}
              key={s.label}
              onClick={() => setActiveTab(i)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed"
        ref={scrollRef}
      >
        {showCmd1 && (
          <div className="whitespace-pre-wrap break-all">
            <span className="text-white/40">$ </span>
            <span className="text-white/80">
              {phase === "typing-1"
                ? scenario.cmd1.slice(0, charIndex)
                : scenario.cmd1}
            </span>
            {phase === "typing-1" && cursorVisible && (
              <span className="text-white/60">▌</span>
            )}
          </div>
        )}

        {showSpin1 && !showResult1 && (
          <div className="text-amber-400">
            {ORA_FRAMES[spinFrame % ORA_FRAMES.length]} {scenario.spin1}
          </div>
        )}

        {showResult1 &&
          scenario.result1.map((line, i) => (
            <div className="text-white/70" key={`r1-${i.toString()}`}>
              {line}
            </div>
          ))}

        {showResult1 && <div className="h-3" />}

        {showCmd2 && (
          <div className="whitespace-pre-wrap break-all">
            <span className="text-white/40">$ </span>
            <span className="text-white/80">
              {phase === "typing-2"
                ? scenario.cmd2.slice(0, charIndex)
                : scenario.cmd2}
            </span>
            {phase === "typing-2" && cursorVisible && (
              <span className="text-white/60">▌</span>
            )}
          </div>
        )}

        {showSpin2 && !showResult2 && (
          <div className="text-amber-400">
            {ORA_FRAMES[spinFrame % ORA_FRAMES.length]} {scenario.spin2}
          </div>
        )}

        {showResult2 &&
          scenario.result2.map((line, i) => (
            <div className="text-emerald-400/80" key={`r2-${i.toString()}`}>
              {line}
            </div>
          ))}

        {phase === "idle" && (
          <div>
            <span className="text-white/40">$ </span>
            {cursorVisible && <span className="text-white/60">▌</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComputerHero() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
              Private Beta
            </span>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl lg:leading-tight">
              The operating system
              <br />
              for your agents.
            </h1>
            <p className="max-w-md text-muted-foreground leading-relaxed">
              Describe what you need in plain language. OpenBeam generates an
              agent, runs it on schedule, learns from every execution, and waits
              for your approval before acting.
            </p>
            <div className="flex items-center gap-3">
              <Link
                className="inline-flex h-10 items-center bg-foreground px-5 font-medium text-background text-sm transition-colors hover:bg-foreground/90"
                href="/docs/computer"
              >
                Get started
              </Link>
              <Link
                className="inline-flex h-10 items-center border border-border px-5 text-sm transition-colors hover:bg-muted"
                href="/docs"
              >
                Documentation
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <Terminal />
          </div>
        </div>

        <div className="mt-10 lg:hidden">
          <Terminal />
        </div>
      </div>
    </section>
  );
}
