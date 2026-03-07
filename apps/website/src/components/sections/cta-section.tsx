"use client";

import { motion } from "motion/react";
import { useCallback, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

const DEPLOY_COMMAND =
  "git clone https://github.com/kuluruvineeth/openbeam && cd openbeam && docker compose up -d";

export function CTASection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(DEPLOY_COMMAND)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(Function.prototype as () => void);
  }, []);

  return (
    <section className="bg-background py-16 sm:py-24 lg:py-32">
      <motion.div
        className="mx-auto max-w-[1400px] px-4 text-center"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: EASE }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
          Good search shouldn&apos;t require
          <br className="hidden sm:block" />
          <span className="text-muted-foreground"> a sales call</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans text-base text-muted-foreground leading-relaxed">
          Copy the command. Connect your tools. That&apos;s the whole
          onboarding.
        </p>

        <div className="mx-auto mt-8 max-w-lg">
          <button
            className="group flex w-full items-center justify-between border border-border/50 bg-[#0a0a0a] px-5 py-3 font-mono text-sm transition-colors duration-200 hover:border-border"
            onClick={handleCopy}
            type="button"
          >
            <span className="truncate text-white/60">
              <span className="text-white/30">$ </span>
              git clone ... && docker compose up -d
            </span>
            {copied ? (
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/50"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <rect height="13" rx="2" width="13" x="9" y="9" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            className="flex h-11 items-center justify-center bg-primary px-8 font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            href="https://docs.openbeam.work/quickstart"
          >
            Start searching
          </a>
          <a
            className="flex h-11 items-center justify-center gap-2 border border-border bg-background px-6 font-sans text-foreground text-sm transition-colors hover:bg-secondary"
            href="https://github.com/kuluruvineeth/openbeam"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            Read the source
          </a>
        </div>

        <p className="mt-6 font-sans text-muted-foreground/60 text-xs">
          Requires Docker · MIT license · Your data never leaves your servers
        </p>
      </motion.div>
    </section>
  );
}
