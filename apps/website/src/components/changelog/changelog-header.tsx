"use client";

import { motion } from "motion/react";
import { analytics } from "@/lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ChangelogHeader() {
  return (
    <div className="border-border border-b pt-32 pb-12 sm:pt-40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.h1
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="font-medium font-serif text-4xl sm:text-5xl"
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Changelog
        </motion.h1>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
        >
          <p className="text-base text-muted-foreground">
            What we&apos;ve been working on
          </p>
          <a
            className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/changelog/feed.xml"
            onClick={() => analytics.changelogRssSubscribed()}
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 text-orange-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <title>RSS</title>
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
            </svg>
            Subscribe
          </a>
        </motion.div>
      </div>
    </div>
  );
}
