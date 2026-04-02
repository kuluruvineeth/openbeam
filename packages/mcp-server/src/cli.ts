import { startProxy } from "./proxy.js";

const DEFAULT_SERVER_URL = "https://api.openbeam.work";

function parseArgs(argv: string[]): { apiKey: string; serverUrl: string } {
  let apiKey = process.env.OPENBEAM_API_KEY ?? "";
  let serverUrl = DEFAULT_SERVER_URL;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--api-key" && next) {
      apiKey = next;
      i += 1;
    } else if (arg?.startsWith("--api-key=")) {
      apiKey = arg.slice("--api-key=".length);
    } else if (arg === "--server-url" && next) {
      serverUrl = next;
      i += 1;
    } else if (arg?.startsWith("--server-url=")) {
      serverUrl = arg.slice("--server-url=".length);
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!apiKey) {
    process.stderr.write(
      "Error: API key required. Pass --api-key or set OPENBEAM_API_KEY.\n"
    );
    printUsage();
    process.exit(1);
  }

  return { apiKey, serverUrl };
}

function printUsage(): void {
  process.stderr.write(
    [
      "",
      "Usage: openbeam-mcp [options]",
      "",
      "Options:",
      "  --api-key <key>       OpenBeam API key (or set OPENBEAM_API_KEY)",
      "  --server-url <url>    Server URL (default: https://api.openbeam.work)",
      "  -h, --help            Show this help",
      "",
    ].join("\n")
  );
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  await startProxy(options);
}
