import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ChangelogEntry = {
  slug: string;
  title: string;
  date: string;
  version: string;
  description: string;
  videoId?: string;
  categories: string[];
  content: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "changelog");
const MDX_EXT = /\.mdx$/;

function parseEntry(filename: string): ChangelogEntry {
  const slug = filename.replace(MDX_EXT, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    version: data.version as string,
    description: data.description as string,
    videoId: (data.videoId as string) || undefined,
    categories: (data.categories as string[]) || [],
    content,
  };
}

export function getAllEntries(): ChangelogEntry[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map(parseEntry)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getEntryBySlug(slug: string): ChangelogEntry | undefined {
  const filename = `${slug}.mdx`;
  const filepath = path.join(CONTENT_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return;
  }

  return parseEntry(filename);
}
