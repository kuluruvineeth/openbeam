const COMMAND_PREFIX_RE = /^\/?\w+\s*/;

export function stripCommandPrefix(text: string, command?: string): string {
  if (command) {
    return text.replace(COMMAND_PREFIX_RE, "").trim();
  }
  return text.trim();
}
