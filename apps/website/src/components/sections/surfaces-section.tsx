"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Surface {
  title: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  detail: string;
}

const SURFACES: Surface[] = [
  {
    title: "Web",
    label: "Browser",
    description: "Send a link. Your teammate is searching in seconds.",
    icon: GlobeIcon,
    detail:
      "The full platform in a browser tab. Results are links — drop one in Slack and your teammate sees exactly what you see.",
  },
  {
    title: "Desktop",
    label: "Native app",
    description: "Opt+Space. Answers before your fingers leave the keyboard.",
    icon: DesktopIcon,
    detail:
      "A local daemon syncs in the background. Search returns before you finish typing. No network? No difference.",
  },
  {
    title: "Mobile",
    label: "iOS & Android",
    description: "Push when it matters. Voice when your hands are full.",
    icon: MobileIcon,
    detail:
      "Native iOS and Android. Push notifications surface what changed. Voice queries when typing isn't an option. Lock screen actions — tap, don't unlock.",
  },
  {
    title: "CLI",
    label: "Terminal",
    description: "Pipe it. Script it. Cron it. Your index speaks JSON.",
    icon: TerminalIcon,
    detail:
      "Three commands: search, ask, sync. Output is JSON — pipe it to jq, feed it to scripts, wire it into CI. Shell completions for every subcommand.",
  },
];

const CLI_LINES = [
  {
    prompt: true,
    text: 'openbeam search "Q4 revenue deck" --from slack,drive',
  },
  { text: "" },
  { text: "  1. Q4 Revenue Summary.pdf", color: "text-white/90" },
  { text: "     Google Drive · Updated 2 days ago", color: "text-white/40" },
  { text: "" },
  { text: "  2. #finance: Q4 numbers are in", color: "text-white/90" },
  { text: "     Slack · 3 hours ago", color: "text-white/40" },
  { text: "" },
  { text: "  3. Revenue Forecast — Q4 2026", color: "text-white/90" },
  { text: "     Notion · Updated yesterday", color: "text-white/40" },
  { text: "" },
  { text: "3 results in 47ms", color: "text-emerald-400" },
];

function CLIDemo({ active }: { active: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const reset = useCallback(() => {
    setLineIndex(0);
    setCharIndex(0);
  }, []);

  useEffect(() => {
    if (active) {
      reset();
    }
  }, [active, reset]);

  useEffect(() => {
    if (!active || lineIndex >= CLI_LINES.length) {
      if (lineIndex >= CLI_LINES.length) {
        timerRef.current = setTimeout(reset, 3000);
      }
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }

    const line = CLI_LINES[lineIndex];
    const fullText = line.text;

    if (line.prompt && charIndex < fullText.length) {
      timerRef.current = setTimeout(() => setCharIndex((c) => c + 1), 20);
    } else {
      let delay = 80;
      if (line.prompt) {
        delay = 300;
      } else if (line.text === "") {
        delay = 60;
      }
      timerRef.current = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, delay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [active, lineIndex, charIndex, reset]);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] font-mono text-[13px] leading-relaxed">
      <div className="flex items-center gap-2 border-white/[0.06] border-b px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-white/30 text-xs">Terminal</span>
      </div>
      <div className="flex-1 p-4">
        {CLI_LINES.slice(0, lineIndex + 1).map((line, i) => {
          const isCurrent = i === lineIndex;
          const isTyping =
            isCurrent && line.prompt && charIndex < line.text.length;
          const visibleText =
            isCurrent && line.prompt
              ? line.text.slice(0, charIndex)
              : line.text;

          return (
            <div className="whitespace-pre" key={i}>
              {line.prompt && <span className="text-white/40">{"~ ▸ "}</span>}
              <span className={line.color ?? "text-white/80"}>
                {visibleText}
              </span>
              {isTyping && (
                <span className="animate-pulse text-white/60">▌</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DOT_COLORS = ["bg-blue-400/60", "bg-purple-400/60", "bg-white/20"];

function WebPreview() {
  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="flex items-center gap-2 border-white/[0.06] border-b px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex h-6 w-48 items-center justify-center border border-white/[0.08] bg-white/[0.03]">
          <span className="text-[10px] text-white/30">app.openbeam.work</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex h-10 items-center gap-3 border border-white/[0.08] bg-white/[0.03] px-4">
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-white/30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-sm text-white/40">
              Search across everything...
            </span>
            <span className="ml-auto border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/20">
              /
            </span>
          </div>
          <div className="space-y-2">
            {[
              "Q4 Revenue Summary.pdf",
              "#finance: Q4 numbers",
              "Revenue Forecast — Q4",
            ].map((item, i) => (
              <div
                className="flex items-center gap-3 border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                key={item}
              >
                <div
                  className={cn("h-2 w-2", DOT_COLORS[i] ?? "bg-white/20")}
                />
                <span className="text-sm text-white/70">{item}</span>
                <span className="ml-auto text-[10px] text-white/20">
                  {["Drive", "Slack", "Notion"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPreview() {
  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="flex items-center border-white/[0.06] border-b px-4 py-3">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-4 text-white/40 text-xs">OpenBeam</span>
        <div className="ml-auto flex items-center gap-1 border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
          <span className="text-[10px] text-white/30">Opt</span>
          <span className="text-[10px] text-white/30">+</span>
          <span className="text-[10px] text-white/30">Space</span>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center pt-8">
        <div className="w-full max-w-sm space-y-3 px-5">
          <div className="flex h-12 items-center gap-3 border border-white/10 bg-white/[0.04] px-4">
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-white/40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-sm text-white/50">Ask anything...</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="px-3 py-1 text-white/20 uppercase tracking-wider">
              Recent
            </div>
            {["Deploy checklist", "API rate limits", "Q4 OKRs"].map((item) => (
              <div
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                key={item}
              >
                <span className="text-white/15">&#8250;</span>
                <span className="text-white/50">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobilePreview() {
  return (
    <div className="flex h-full items-center justify-center bg-[#0a0a0a] p-8">
      <div className="w-48 border border-white/[0.08] bg-[#111]">
        <div className="flex items-center justify-between border-white/[0.06] border-b px-3 py-2">
          <span className="text-[9px] text-white/20">9:41</span>
          <span className="font-medium text-[10px] text-white/40">
            OpenBeam
          </span>
          <div className="flex gap-0.5">
            <div className="h-1.5 w-1.5 bg-white/20" />
            <div className="h-1.5 w-1.5 bg-white/15" />
            <div className="h-1.5 w-1.5 bg-white/10" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          <div className="flex h-7 items-center gap-2 border border-white/[0.08] bg-white/[0.03] px-2">
            <svg
              aria-hidden="true"
              className="h-3 w-3 text-white/25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-[9px] text-white/30">Search...</span>
          </div>
          {["Budget deck", "Standup notes", "API docs"].map((item) => (
            <div
              className="border border-white/[0.05] bg-white/[0.02] px-2 py-1.5"
              key={item}
            >
              <span className="text-[9px] text-white/50">{item}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around border-white/[0.06] border-t px-3 py-2">
          <div className="h-1 w-4 bg-white/20" />
          <div className="h-1 w-4 bg-white/10" />
          <div className="h-1 w-4 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function SurfacePreview({ index, active }: { index: number; active: boolean }) {
  if (index === 0) {
    return <WebPreview />;
  }
  if (index === 1) {
    return <DesktopPreview />;
  }
  if (index === 2) {
    return <MobilePreview />;
  }
  return <CLIDemo active={active} />;
}

export function SurfacesSection() {
  const [activeSurface, setActiveSurface] = useState(0);

  return (
    <section className="bg-background py-16 lg:py-24" id="surfaces">
      <div className="mx-auto max-w-[1400px] px-4">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: EASE }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="mb-3 font-sans text-muted-foreground text-xs uppercase tracking-widest">
            Every interface
          </p>
          <h2 className="font-serif text-2xl text-foreground">
            Where you already are
          </h2>
          <p className="mx-auto mt-3 max-w-lg font-sans text-muted-foreground text-sm leading-relaxed">
            Browser, native app, phone, terminal. Same index. Same agents. Zero
            context switch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          <div className="flex flex-col gap-2">
            {SURFACES.map((surface, index) => {
              const isActive = activeSurface === index;
              return (
                <motion.button
                  className={cn(
                    "group flex items-start gap-4 border p-4 text-left transition-colors duration-200",
                    isActive
                      ? "border-border bg-card"
                      : "border-transparent hover:border-border/50"
                  )}
                  initial={{ opacity: 0, x: -12 }}
                  key={surface.title}
                  onClick={() => setActiveSurface(index)}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.4,
                    ease: EASE,
                  }}
                  type="button"
                  viewport={{ once: true }}
                  whileInView={{ opacity: 1, x: 0 }}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center border transition-colors",
                      isActive
                        ? "border-foreground/20 bg-foreground/5"
                        : "border-border bg-background"
                    )}
                  >
                    <surface.icon
                      className={cn(
                        "transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-sans text-base transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {surface.title}
                      </span>
                      <span className="font-sans text-muted-foreground/60 text-xs">
                        {surface.label}
                      </span>
                    </div>
                    <p className="mt-0.5 font-sans text-muted-foreground text-sm">
                      {surface.description}
                    </p>
                    {isActive && (
                      <motion.p
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 overflow-hidden font-sans text-muted-foreground/80 text-sm leading-relaxed"
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {surface.detail}
                      </motion.p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.div
            className="relative overflow-hidden border border-border/50 bg-[#0a0a0a]"
            initial={{ opacity: 0, y: 16 }}
            transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div
              className="animate-[fadeInScale_0.3s_ease-out_forwards]"
              key={activeSurface}
            >
              <SurfacePreview
                active={activeSurface === 3}
                index={activeSurface}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="14" rx="2" width="20" x="2" y="3" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function MobileIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="20" rx="2" width="14" x="5" y="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
