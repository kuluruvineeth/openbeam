const HOME_PREFIX_PATTERN = /^\/(?:Users|home)\/[^/]+/;

export function shortenPath(path: string): string {
  return path.replace(HOME_PREFIX_PATTERN, "~");
}
