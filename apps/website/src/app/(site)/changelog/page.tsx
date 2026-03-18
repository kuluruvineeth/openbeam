import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { ChangelogEntry } from "@/components/changelog/changelog-entry";
import { ChangelogHeader } from "@/components/changelog/changelog-header";
import { SectionTracker } from "@/components/section-tracker";
import { getAllEntries } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — OpenBeam",
  description:
    "What we've been working on. New features, improvements, and fixes.",
  openGraph: {
    title: "Changelog — OpenBeam",
    description:
      "What we've been working on. New features, improvements, and fixes.",
  },
};

export default function ChangelogPage() {
  const entries = getAllEntries();

  return (
    <>
      <ChangelogHeader />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {entries.map((entry, i) => (
          <SectionTracker
            eventName="changelogEntryViewed"
            key={entry.slug}
            properties={{ version: entry.version, title: entry.title }}
          >
            <ChangelogEntry entry={entry} index={i}>
              <MDXRemote
                options={{
                  mdxOptions: { remarkPlugins: [remarkGfm] },
                }}
                source={entry.content}
              />
            </ChangelogEntry>
          </SectionTracker>
        ))}
      </div>
    </>
  );
}
