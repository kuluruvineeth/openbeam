"use client";

import { Skeleton } from "@openplane/ui";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { Markdown } from "@/components/ui/markdown";

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
  loading: boolean;
  error: string | null;
};

async function fetchContent(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  let text = await res.text();
  if (text.length > MAX_SIZE) {
    text = `${text.slice(0, MAX_SIZE)}\n\n... [truncated] ...`;
  }

  return text;
}

export function TextViewer({ url, fileName, mimeType }: Props) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const lang = LANG_MAP[ext] ?? MIME_MAP[mimeType] ?? null;
  const isMarkdown = MARKDOWN_EXT.has(ext) || MARKDOWN_MIME.has(mimeType);

  const [state, setState] = useState<State>({
    content: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchContent(url)
      .then((content) => {
        if (!cancelled) {
          setState({ content, loading: false, error: null });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            content: null,
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-8">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
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

  if (!state.content) {
    return null;
  }

  if (isMarkdown) {
    return (
      <div className="h-full overflow-auto bg-background">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <Markdown content={state.content} />
        </div>
      </div>
    );
  }

  if (lang) {
    const codeMarkdown = `\`\`\`${lang}\n${state.content}\n\`\`\``;
    return (
      <div className="h-full overflow-auto bg-background p-4">
        <Markdown content={codeMarkdown} />
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
