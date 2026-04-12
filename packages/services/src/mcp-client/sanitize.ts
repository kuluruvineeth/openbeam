const INJECTION_PATTERNS = [
  /<IMPORTANT>[\s\S]*?<\/IMPORTANT>/gi,
  /<SYSTEM>[\s\S]*?<\/SYSTEM>/gi,
  /<INST>[\s\S]*?<\/INST>/gi,
  /<!--[\s\S]*?-->/g,
  /ignore\s+(?:all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(?:an?\s+)?assistant/gi,
  /exfiltrate/gi,
  /base64\s+encode/gi,
  /without\s+the\s+user'?s?\s+knowledge/gi,
  /data:[a-zA-Z]+\/[a-zA-Z]+;base64,[A-Za-z0-9+/]{20,}/g,
];

const SLUG_RE = /[^a-z0-9_]/g;

function stripNonPrintable(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const isPrintable =
      code === 0x09 || code === 0x0a || code === 0x0d || code >= 0x20;
    if (isPrintable && code !== 0x7f) {
      result += text[i];
    }
  }
  return result;
}
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_NAME_LENGTH = 64;

export function sanitizeToolDescription(raw: string): string {
  let cleaned = raw;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = stripNonPrintable(cleaned);
  cleaned = cleaned.trim();
  if (cleaned.length > MAX_DESCRIPTION_LENGTH) {
    cleaned = `${cleaned.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
  }
  return cleaned;
}

export function sanitizeToolName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(SLUG_RE, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, MAX_NAME_LENGTH);
}

export function sanitizeToolResult(content: string): string {
  let cleaned = content;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return stripNonPrintable(cleaned);
}

export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}
