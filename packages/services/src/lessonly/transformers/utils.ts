export function buildLessonlyUrl(subdomain: string, path: string): string {
  return `https://${subdomain}.lessonly.com${path}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
