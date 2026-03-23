const STYLE_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const SCRIPT_REGEX = /<script[^>]*>[\s\S]*?<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const ENTITY_NBSP = /&nbsp;/g;
const ENTITY_AMP = /&amp;/g;
const ENTITY_LT = /&lt;/g;
const ENTITY_GT = /&gt;/g;
const ENTITY_QUOT = /&quot;/g;
const WHITESPACE_REGEX = /\s+/g;
const REFS_HEADS_REGEX = /^refs\/heads\//;

export function stripHtml(html: string): string {
  return html
    .replace(STYLE_REGEX, "")
    .replace(SCRIPT_REGEX, "")
    .replace(HTML_TAG_REGEX, " ")
    .replace(ENTITY_NBSP, " ")
    .replace(ENTITY_AMP, "&")
    .replace(ENTITY_LT, "<")
    .replace(ENTITY_GT, ">")
    .replace(ENTITY_QUOT, '"')
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

export function branchDisplayName(refName: string): string {
  return refName.replace(REFS_HEADS_REGEX, "");
}

export function priorityLabel(priority?: number): string | undefined {
  if (priority === undefined) {
    return;
  }
  const labels: Record<number, string> = {
    1: "Critical",
    2: "High",
    3: "Medium",
    4: "Low",
  };
  return labels[priority] ?? String(priority);
}
