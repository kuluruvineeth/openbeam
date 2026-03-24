export function buildCanvaUrl(designId: string): string {
  return `https://www.canva.com/design/${designId}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
