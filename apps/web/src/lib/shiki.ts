import type { BundledLanguage, Highlighter } from "shiki";

const LANGS: BundledLanguage[] = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "scss",
  "xml",
  "yaml",
  "markdown",
  "python",
  "ruby",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "php",
  "sql",
  "bash",
  "dockerfile",
  "graphql",
  "vue",
  "svelte",
  "toml",
  "prisma",
];

const THEME = {
  name: "openplane",
  type: "dark" as const,
  colors: {
    "editor.background": "var(--shiki-bg)",
    "editor.foreground": "var(--shiki-fg)",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--shiki-comment)" },
    },
    {
      scope: ["string", "string.quoted"],
      settings: { foreground: "var(--shiki-string)" },
    },
    {
      scope: ["constant", "constant.numeric", "constant.language"],
      settings: { foreground: "var(--shiki-constant)" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "var(--shiki-keyword)" },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "var(--shiki-function)" },
    },
    {
      scope: ["variable", "variable.parameter"],
      settings: { foreground: "var(--shiki-variable)" },
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type"],
      settings: { foreground: "var(--shiki-type)" },
    },
    {
      scope: ["punctuation"],
      settings: { foreground: "var(--shiki-punctuation)" },
    },
    {
      scope: ["entity.name.tag"],
      settings: { foreground: "var(--shiki-tag)" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "var(--shiki-attribute)" },
    },
  ],
};

let instance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (instance) {
    return instance;
  }
  const { createHighlighter } = await import("shiki");
  instance = await createHighlighter({ themes: [THEME], langs: LANGS });
  return instance;
}

export async function highlight(code: string, lang: string): Promise<string> {
  try {
    const h = await getHighlighter();
    return h.codeToHtml(code, {
      lang: lang as BundledLanguage,
      theme: "openplane",
    });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
