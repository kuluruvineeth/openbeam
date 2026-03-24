export function buildAhaUrl(subdomain: string, path: string): string {
  return `https://${subdomain}.aha.io${path}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
