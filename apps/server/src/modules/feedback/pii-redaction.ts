const PII_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b(?:sk|pk|api|key|token|secret)[-_]?[a-zA-Z0-9]{20,}\b/gi,
];

export function redactPii(text: string): string {
  let redacted = text;
  for (const regex of PII_PATTERNS) {
    redacted = redacted.replace(regex, "[REDACTED]");
  }
  return redacted;
}
