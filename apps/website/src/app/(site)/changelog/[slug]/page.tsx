import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { CategoryBadge } from "@/components/changelog/category-badge";
import { ShareButton } from "@/components/changelog/share-button";
import { VersionBadge } from "@/components/changelog/version-badge";
import { YouTubeEmbed } from "@/components/changelog/youtube-embed";
import { getAllEntries, getEntryBySlug } from "@/lib/changelog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllEntries().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);
  if (!entry) {
    return {};
  }

  return {
    title: `${entry.title} — OpenBeam Changelog`,
    description: entry.description,
    openGraph: {
      title: `${entry.title} — OpenBeam Changelog`,
      description: entry.description,
    },
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ChangelogEntryPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);
  if (!entry) {
    notFound();
  }

  const entries = getAllEntries();
  const currentIndex = entries.findIndex((e) => e.slug === slug);
  const prev =
    currentIndex < entries.length - 1 ? entries[currentIndex + 1] : undefined;
  const next = currentIndex > 0 ? entries[currentIndex - 1] : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 sm:pt-40">
      <a
        className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/changelog"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          role="img"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <title>Back</title>
          <path d="M19 12H5m0 0 7 7m-7-7 7-7" />
        </svg>
        Changelog
      </a>

      <div className="mt-8 flex items-center gap-3">
        <time className="font-mono text-muted-foreground text-sm tabular-nums">
          {formatDate(entry.date)}
        </time>
        <VersionBadge version={entry.version} />
      </div>

      <h1 className="mt-4 font-medium font-serif text-3xl sm:text-4xl">
        {entry.title}
      </h1>

      <p className="mt-4 text-base text-foreground/80 leading-relaxed">
        {entry.description}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {entry.categories.map((cat) => (
            <CategoryBadge category={cat} key={cat} />
          ))}
        </div>
        <ShareButton version={entry.version} />
      </div>

      {entry.videoId && (
        <div className="mt-8">
          <YouTubeEmbed version={entry.version} videoId={entry.videoId} />
        </div>
      )}

      <div className="blog-content mt-10">
        <MDXRemote
          options={{
            mdxOptions: { remarkPlugins: [remarkGfm] },
          }}
          source={entry.content}
        />
      </div>

      {(prev || next) && (
        <nav className="mt-16 flex items-center justify-between border-border border-t pt-8">
          {prev ? (
            <a className="group flex flex-col" href={`/changelog/${prev.slug}`}>
              <span className="text-muted-foreground text-xs">Previous</span>
              <span className="text-sm transition-colors group-hover:text-muted-foreground">
                {prev.title}
              </span>
            </a>
          ) : (
            <div />
          )}
          {next ? (
            <a
              className="group flex flex-col items-end text-right"
              href={`/changelog/${next.slug}`}
            >
              <span className="text-muted-foreground text-xs">Next</span>
              <span className="text-sm transition-colors group-hover:text-muted-foreground">
                {next.title}
              </span>
            </a>
          ) : (
            <div />
          )}
        </nav>
      )}
    </div>
  );
}
