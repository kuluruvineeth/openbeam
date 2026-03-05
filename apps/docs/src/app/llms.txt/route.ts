import { source } from "@/lib/source";

export const revalidate = false;

export function GET() {
  const pages = source.getPages();
  const baseUrl = "https://openplane.com/docs";

  const sections: Record<string, { title: string; url: string }[]> = {};

  for (const page of pages) {
    const slug = page.slugs[0] ?? "root";
    const title = page.data.title;
    const url = `${baseUrl}/${page.slugs.join("/")}`;

    if (!sections[slug]) {
      sections[slug] = [];
    }
    sections[slug].push({ title, url });
  }

  const lines: string[] = [
    "# OpenPlane",
    "",
    "> Open-source enterprise search and AI assistant platform. Connect 21 data sources, index everything into a unified search engine (Vespa), and query with hybrid search (BM25 + dense vectors + sparse vectors). Built with TypeScript, Next.js, Hono, Temporal, and PostgreSQL.",
    "",
    "## Overview",
    "",
    "OpenPlane indexes content from SaaS tools (Slack, Gmail, Notion, GitHub, Linear, Google Drive), IoT platforms (Samsara, MQTT, OPC-UA), and industrial systems into a single searchable knowledge base. It provides:",
    "",
    "- Hybrid search combining keyword matching, semantic similarity, and sparse vectors",
    "- Permission-aware results filtered by source system access controls",
    "- AI agents with 6 orchestration patterns (LLM, Sequential, Parallel, Coordinator, Loop, Generator-Critic)",
    "- RAG pipeline with query analysis, grounding, and citation tracking",
    "- MCP server exposing all tools to external AI clients",
    "- Go CLI with full API access, profiles, and plugin system",
    "- Edge runtime for offline search using SQLite FTS5 + vector similarity",
    "",
    "## Architecture",
    "",
    "- **Monorepo**: Turborepo + Bun workspaces",
    "- **Frontend**: Next.js 16, React 19, TailwindCSS 4, shadcn/ui",
    "- **API**: Hono (HTTP) + tRPC 11 (type-safe RPC)",
    "- **Workflows**: Temporal for connector syncs, indexing, entity extraction",
    "- **Search**: Vespa (hybrid BM25 + dense + sparse vectors)",
    "- **Database**: PostgreSQL + Prisma ORM",
    "- **Cache**: Redis (rate limiting, job coordination)",
    "- **AI**: Vercel AI SDK, multi-provider (Anthropic, OpenAI, Google)",
    "- **CLI**: Go 1.24, Cobra, GoReleaser",
    "- **ML Engine**: Python (FastAPI) for embeddings and NER",
    "",
    "## Documentation",
    "",
  ];

  const sectionOrder = [
    "getting-started",
    "architecture",
    "connectors",
    "search",
    "ai",
    "api",
    "edge",
    "security",
    "cli",
    "self-hosting",
    "contributing",
  ];

  for (const key of sectionOrder) {
    const items = sections[key];
    if (!items) {
      continue;
    }

    const sectionTitle = key
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

    lines.push(`### ${sectionTitle}`);
    lines.push("");

    for (const item of items) {
      lines.push(`- [${item.title}](${item.url})`);
    }

    lines.push("");
  }

  lines.push("## API");
  lines.push("");
  lines.push(
    "- Base URL: `http://localhost:3000` (self-hosted) or `https://api.openplane.com`"
  );
  lines.push("- Authentication: Bearer token via `Authorization` header");
  lines.push(
    "- Search endpoint: `POST /api/search` with `{ query, limit, mode }` body"
  );
  lines.push("- Connector management: tRPC routers at `/api/trpc/connector.*`");
  lines.push("- AI chat: `POST /api/ai/chat` with streaming SSE responses");
  lines.push(
    "- MCP server: `openplane mcp serve` exposes tools via JSON-RPC 2.0"
  );
  lines.push("");
  lines.push("## Full Documentation");
  lines.push("");
  lines.push("- [Full text of all docs](https://openplane.com/llms-full.txt)");
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
