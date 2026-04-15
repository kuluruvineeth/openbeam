type Article = {
  uri: string;
  title: string;
  content?: string | null;
  sourceCount?: number | null;
  updatedAt?: string | null;
};

type CompilationStatus = {
  topic: string;
  status: string;
  articleUri?: string | null;
  sourceCount?: number | null;
};

export function formatArticle(article: Article): string {
  const parts: string[] = [`# ${article.title}`, "", `URI: ${article.uri}`];

  if (article.sourceCount != null) {
    parts.push(`Sources: ${article.sourceCount}`);
  }

  if (article.content) {
    parts.push("", article.content);
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push("• Browse more articles: kb_browse");
  parts.push(
    "• Search for related documents: search_documents with a related query."
  );

  return parts.join("\n");
}

export function formatCompilationStatus(status: CompilationStatus): string {
  const parts: string[] = [
    `Compilation: ${status.topic}`,
    `Status: ${status.status}`,
  ];

  if (status.articleUri) {
    parts.push(`Article URI: ${status.articleUri}`);
  }

  if (status.sourceCount != null) {
    parts.push(`Sources used: ${status.sourceCount}`);
  }

  parts.push("");
  parts.push("Next steps:");
  if (status.articleUri) {
    parts.push(`• Read the article: kb_article with URI ${status.articleUri}`);
  }
  parts.push("• Browse all articles: kb_browse");

  return parts.join("\n");
}
