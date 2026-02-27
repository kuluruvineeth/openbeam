import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DAEMON_DIR = path.resolve(SCRIPT_DIR, "..");
const HELPER_DIR = path.resolve(DAEMON_DIR, "native-helper", "swift-helper");

function runSwiftBuild(configuration: "debug" | "release"): void {
  const build = spawnSync(
    "swift",
    ["build", "--configuration", configuration],
    {
      cwd: HELPER_DIR,
      stdio: "inherit",
    }
  );

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function resolveSwiftBinaryPath(configuration: "debug" | "release"): string {
  const showBinPath = spawnSync(
    "swift",
    ["build", "--configuration", configuration, "--show-bin-path"],
    {
      cwd: HELPER_DIR,
      encoding: "utf8",
    }
  );

  if (showBinPath.status !== 0) {
    const stderr = showBinPath.stderr?.trim();
    if (stderr && stderr.length > 0) {
      process.stderr.write(`${stderr}\n`);
    }
    process.exit(showBinPath.status ?? 1);
  }

  const binDir = showBinPath.stdout.trim();
  if (binDir.length === 0) {
    process.stderr.write("swift --show-bin-path returned an empty path\n");
    process.exit(1);
  }

  return path.join(binDir, "SwiftHelper");
}

function main(): void {
  if (process.platform !== "darwin") {
    process.stderr.write(
      "Swift native helper build is only supported on macOS (darwin).\n"
    );
    process.exit(1);
  }

  const requestedConfig = process.env.OPENPLANE_NATIVE_HELPER_BUILD_CONFIG;
  const configuration = requestedConfig === "release" ? "release" : "debug";

  if (!existsSync(path.join(HELPER_DIR, "Package.swift"))) {
    process.stderr.write(
      `Swift helper package not found at ${path.join(HELPER_DIR, "Package.swift")}\n`
    );
    process.exit(1);
  }

  runSwiftBuild(configuration);
  const builtBinary = resolveSwiftBinaryPath(configuration);

  if (!existsSync(builtBinary)) {
    process.stderr.write(`Built helper binary not found: ${builtBinary}\n`);
    process.exit(1);
  }

  const installDir = path.join(os.homedir(), ".openplane", "bin");
  const installPath = path.join(installDir, "SwiftHelper");
  mkdirSync(installDir, { recursive: true });
  copyFileSync(builtBinary, installPath);
  chmodSync(installPath, 0o755);

  process.stdout.write(
    `Installed SwiftHelper (${configuration}) to ${installPath}\n`
  );
}

main();
