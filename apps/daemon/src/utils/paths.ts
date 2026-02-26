import os from "node:os";

export function expandTilde(path: string): string {
  if (path.startsWith("~/")) {
    const homeDir = process.env.HOME || os.homedir();
    return path.replace("~", homeDir);
  }
  if (path === "~") {
    return process.env.HOME || os.homedir();
  }
  return path;
}
