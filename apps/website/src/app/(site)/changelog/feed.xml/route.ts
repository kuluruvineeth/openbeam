import { getAllEntries } from "@/lib/changelog";

const SITE_URL = "https://openbeam.work";

export function GET() {
  const entries = getAllEntries();

  const items = entries
    .map(
      (entry) => `    <entry>
      <title>${escapeXml(entry.title)}</title>
      <link href="${SITE_URL}/changelog/${entry.slug}" rel="alternate" />
      <id>${SITE_URL}/changelog/${entry.slug}</id>
      <updated>${new Date(entry.date).toISOString()}</updated>
      <summary>${escapeXml(entry.description)}</summary>
      <category term="${entry.version}" />
    </entry>`
    )
    .join("\n");

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>OpenBeam Changelog</title>
  <subtitle>What we've been working on</subtitle>
  <link href="${SITE_URL}/changelog" rel="alternate" />
  <link href="${SITE_URL}/changelog/feed.xml" rel="self" />
  <id>${SITE_URL}/changelog</id>
  <updated>${entries[0] ? new Date(entries[0].date).toISOString() : new Date().toISOString()}</updated>
${items}
</feed>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
