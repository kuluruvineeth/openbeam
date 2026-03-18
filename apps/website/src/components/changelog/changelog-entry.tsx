"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { ChangelogEntry as Entry } from "@/lib/changelog";
import { CategoryBadge } from "./category-badge";
import { VersionBadge } from "./version-badge";
import { YouTubeEmbed } from "./youtube-embed";

const EASE = [0.16, 1, 0.3, 1] as const;

interface ChangelogEntryProps {
  entry: Entry;
  index: number;
  children: React.ReactNode;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChangelogEntry({
  entry,
  index,
  children,
}: ChangelogEntryProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className="grid grid-cols-1 gap-8 border-border border-b py-16 last:border-b-0 md:grid-cols-4"
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      transition={{ delay: index * 0.15, duration: 0.6, ease: EASE }}
    >
      <div className="md:sticky md:top-24 md:self-start">
        <time className="font-mono text-muted-foreground text-sm tabular-nums">
          {formatDate(entry.date)}
        </time>
        <div className="mt-2">
          <VersionBadge version={entry.version} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.categories.map((cat) => (
            <CategoryBadge category={cat} key={cat} />
          ))}
        </div>
      </div>

      <div className="md:col-span-3">
        <Link className="group" href={`/changelog/${entry.slug}`}>
          <h2 className="font-medium font-serif text-2xl transition-colors group-hover:text-muted-foreground sm:text-3xl">
            {entry.title}
          </h2>
        </Link>

        <p className="mt-3 text-base text-foreground/80 leading-relaxed">
          {entry.description}
        </p>

        {entry.videoId && (
          <div className="mt-6">
            <YouTubeEmbed version={entry.version} videoId={entry.videoId} />
          </div>
        )}

        <div className="blog-content mt-8">{children}</div>
      </div>
    </motion.div>
  );
}
