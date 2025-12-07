"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { CopyButton } from "@/components/ui/code-block";
import { Markdown } from "@/components/ui/markdown";
import { highlight } from "@/lib/shiki";

const MAX_SIZE = 500_000;

const LANG_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  cs: "csharp",
  sh: "bash",
  yml: "yaml",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  xml: "xml",
  yaml: "yaml",
  md: "markdown",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  php: "php",
  sql: "sql",
  bash: "bash",
  dockerfile: "dockerfile",
  graphql: "graphql",
  vue: "vue",
  svelte: "svelte",
  toml: "toml",
  prisma: "prisma",
};

const MIME_MAP: Record<string, string> = {
  "application/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
};

const MARKDOWN_EXT = new Set(["md", "mdx"]);
const MARKDOWN_MIME = new Set(["text/markdown", "text/x-markdown"]);

type Props = {
  url: string;
  fileName: string;
  mimeType: string;
};

type State = {
  content: string | null;
  highlighted: string | null;
  loading: boolean;
  error: string | null;
};

async function fetchAndHighlight(
  url: string,
  shouldHighlight: boolean,
  lang: string | null
): Promise<{ content: string; highlighted: string | null }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  let text = await res.text();
  if (text.length > MAX_SIZE) {
    text = `${text.slice(0, MAX_SIZE)}\n\n... [truncated] ...`;
  }

  let highlighted: string | null = null;
  if (shouldHighlight && lang) {
    highlighted = await highlight(text, lang);
  }

  return { content: text, highlighted };
}

export function TextViewer({ url, fileName, mimeType }: Props) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const lang = LANG_MAP[ext] ?? MIME_MAP[mimeType] ?? null;
  const isMarkdown = MARKDOWN_EXT.has(ext) || MARKDOWN_MIME.has(mimeType);
  const shouldHighlight = lang !== null && !isMarkdown;

  const [state, setState] = useState<State>({
    content: null,
    highlighted: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchAndHighlight(url, shouldHighlight, lang)
      .then(({ content, highlighted }) => {
        if (!cancelled) {
          setState({ content, highlighted, loading: false, error: null });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            content: null,
            highlighted: null,
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, shouldHighlight, lang]);

  if (state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-6 animate-spin rounded-full border-2 border-foreground/10 border-t-foreground/40" />
          <span className="text-foreground/40 text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icons.AlertCircle className="text-destructive/50" size={24} />
          <p className="text-foreground/50 text-sm">Failed to load content</p>
          <code className="text-[10px] text-foreground/30">{state.error}</code>
        </div>
      </div>
    );
  }

  if (isMarkdown && state.content) {
    return (
      <div className="h-full overflow-auto bg-background">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <Markdown content={state.content} />
        </div>
      </div>
    );
  }

  if (state.highlighted && state.content) {
    return (
      <div className="group relative h-full overflow-auto bg-code text-code-foreground">
        <CopyButton
          className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
          content={state.content}
        />
        <div
          className="shiki-wrapper min-h-full p-4 font-mono text-xs leading-relaxed"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted
          dangerouslySetInnerHTML={{ __html: state.highlighted }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background-100">
      <pre className="min-h-full whitespace-pre-wrap p-4 font-mono text-foreground/80 text-xs leading-relaxed">
        {state.content}
      </pre>
    </div>
  );
}
