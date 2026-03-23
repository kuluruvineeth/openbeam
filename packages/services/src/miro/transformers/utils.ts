export function buildMiroBoardUrl(boardId: string): string {
  return `https://miro.com/app/board/${boardId}/`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractItemContent(data: {
  content?: string;
  title?: string;
  description?: string;
  fields?: Array<{ value?: string; tooltip?: string }>;
}): string {
  const parts: string[] = [];

  if (data.content) {
    parts.push(stripHtml(data.content));
  }
  if (data.title) {
    parts.push(stripHtml(data.title));
  }
  if (data.description) {
    parts.push(stripHtml(data.description));
  }
  if (data.fields) {
    for (const field of data.fields) {
      if (field.value) {
        parts.push(stripHtml(field.value));
      }
    }
  }

  return parts.join(" — ");
}
