export function stripCwdPrefix(filePath: string, cwd?: string): string {
  if (!(cwd && filePath)) {
    return filePath;
  }

  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const normalizedCwd = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedPath = filePath.replace(/\\/g, "/");
  const prefix = `${normalizedCwd}/`;

  if (normalizedPath.startsWith(prefix)) {
    return normalizedPath.slice(prefix.length);
  }
  if (normalizedPath === normalizedCwd) {
    return ".";
  }
  return filePath;
}
