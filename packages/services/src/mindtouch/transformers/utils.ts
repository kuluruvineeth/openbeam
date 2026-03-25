const TRAILING_SLASHES = /\/+$/;
const HTML_TAGS = /<[^>]*>/g;
const NBSP = /&nbsp;/g;
const AMP = /&amp;/g;
const LT = /&lt;/g;
const GT = /&gt;/g;
const QUOT = /&quot;/g;
const APOS = /&#39;/g;
const WHITESPACE = /\s+/g;

export function buildMindtouchUrl(instanceUrl: string, path: string): string {
  const base = instanceUrl.replace(TRAILING_SLASHES, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(HTML_TAGS, " ")
    .replace(NBSP, " ")
    .replace(AMP, "&")
    .replace(LT, "<")
    .replace(GT, ">")
    .replace(QUOT, '"')
    .replace(APOS, "'")
    .replace(WHITESPACE, " ")
    .trim();
}
