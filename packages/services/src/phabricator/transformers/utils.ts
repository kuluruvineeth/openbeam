export function buildPhabricatorUrl(instanceUrl: string, path: string): string {
  return `${instanceUrl}${path}`;
}

export function remarkupToPlainText(remarkup: string): string {
  return remarkup
    .replace(/={2,}[^=]+=+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\/\//g, "")
    .replace(
      /\[\[([^\]|]+)\|?([^\]]*)\]\]/g,
      (_m, _link, text) => text || _link
    )
    .replace(/\{[A-Z]\d+[^}]*\}/g, "")
    .replace(/^[-*#]+\s/gm, "")
    .replace(/```[^`]*```/gs, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
