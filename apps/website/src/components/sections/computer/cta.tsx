"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PROMPTS = [
  "Monitor connector health and auto-fix sync failures",
  "Create a weekly digest of new content across all sources",
  "Alert me when documents contain exposed credentials",
  "Generate onboarding reading lists for new engineers",
  "Find stale content older than 90 days and propose archival",
];

const TYPING_SPEED = 45;
const PAUSE_BETWEEN = 2500;

function PromptShowcase() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const currentPrompt = PROMPTS[promptIndex];

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  const advancePrompt = useCallback(() => {
    setPromptIndex((p) => (p + 1) % PROMPTS.length);
    setCharIndex(0);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (charIndex < currentPrompt.length) {
      timerRef.current = setTimeout(
        () => setCharIndex((c) => c + 1),
        TYPING_SPEED
      );
    } else {
      timerRef.current = setTimeout(advancePrompt, PAUSE_BETWEEN);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [charIndex, currentPrompt, advancePrompt]);

  return (
    <div className="mx-auto max-w-2xl border border-border/40 bg-[#0a0a0a] px-5 py-4 font-mono text-sm">
      <span className="text-white/40">
        $ openbeam computer generate --description &quot;
      </span>
      <span className="text-white/80">{currentPrompt.slice(0, charIndex)}</span>
      {cursorVisible && <span className="text-white/60">▌</span>}
      <span className="text-white/40">&quot;</span>
    </div>
  );
}

export function ComputerCTA() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-12">
          <PromptShowcase />
        </div>

        <div
          className="border border-border p-8 md:p-12"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-60deg, hsla(var(--border), 0.15), hsla(var(--border), 0.15) 1px, transparent 1px, transparent 6px)",
          }}
        >
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
              Get started
            </h2>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Deploy agents that monitor your knowledge base, track connector
              health, and surface insights — on your schedule, under your
              control.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
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
        </div>
      </div>
    </section>
  );
}
