import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createWorktree,
  deleteOpenBeamWorktree,
  deriveWorktreeProjectHash,
  getWorktreeTerminalSpecs,
  isOpenBeamOwnedWorktreeCwd,
  listOpenBeamWorktrees,
  resolveWorktreeRuntimeEnv,
  runWorktreeSetupCommands,
  slugify,
  type WorktreeSetupCommandProgressEvent,
} from "./worktree";
import { getOpenBeamWorktreeMetadataPath } from "./worktree-metadata";

describe("createWorktree", () => {
  let tempDir: string;
  let repoDir: string;
  let openbeamHome: string;

  beforeEach(() => {
    // Use realpathSync to resolve symlinks (e.g., /var -> /private/var on macOS)
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), "worktree-test-")));
    repoDir = join(tempDir, "test-repo");
    openbeamHome = join(tempDir, "openbeam-home");

    // Create a git repo with an initial commit
    execSync(`mkdir -p ${repoDir}`);
    execSync("git init -b main", { cwd: repoDir });
    execSync("git config user.email 'test@test.com'", { cwd: repoDir });
    execSync("git config user.name 'Test'", { cwd: repoDir });
    execSync("echo 'hello' > file.txt", { cwd: repoDir });
    execSync("git add .", { cwd: repoDir });
    execSync("git -c commit.gpgsign=false commit -m 'initial'", {
      cwd: repoDir,
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates a worktree for the current branch (main)", async () => {
    const projectHash = await deriveWorktreeProjectHash(repoDir);
    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "hello-world",
      openbeamHome,
    });

    expect(result.worktreePath).toBe(
      join(openbeamHome, "worktrees", projectHash, "hello-world")
    );
    expect(existsSync(result.worktreePath)).toBe(true);
    expect(existsSync(join(result.worktreePath, "file.txt"))).toBe(true);
    const metadataPath = getOpenBeamWorktreeMetadataPath(result.worktreePath);
    expect(existsSync(metadataPath)).toBe(true);
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    expect(metadata).toMatchObject({ version: 1, baseRefName: "main" });
  });

  it("detects openbeam-owned worktrees across realpath differences (macOS /var vs /private/var)", async () => {
    // Intentionally create repo using the non-realpath tmpdir() variant (often /var/... on macOS).
    const varTempDir = mkdtempSync(join(tmpdir(), "worktree-realpath-test-"));
    const privateTempDir = realpathSync(varTempDir);
    const varRepoDir = join(varTempDir, "test-repo");
    const varOpenBeamHome = join(varTempDir, "openbeam-home");
    execSync(`mkdir -p ${varRepoDir}`);
    execSync("git init -b main", { cwd: varRepoDir });
    execSync("git config user.email 'test@test.com'", { cwd: varRepoDir });
    execSync("git config user.name 'Test'", { cwd: varRepoDir });
    execSync("echo 'hello' > file.txt", { cwd: varRepoDir });
    execSync("git add .", { cwd: varRepoDir });
    execSync("git -c commit.gpgsign=false commit -m 'initial'", {
      cwd: varRepoDir,
    });

    const _result = await createWorktree({
      branchName: "main",
      cwd: varRepoDir,
      baseBranch: "main",
      worktreeSlug: "realpath-test",
      openbeamHome: varOpenBeamHome,
    });

    const projectHash = await deriveWorktreeProjectHash(varRepoDir);
    const privateWorktreePath = join(
      privateTempDir,
      "openbeam-home",
      "worktrees",
      projectHash,
      "realpath-test"
    );
    expect(existsSync(privateWorktreePath)).toBe(true);

    const ownership = await isOpenBeamOwnedWorktreeCwd(privateWorktreePath, {
      openbeamHome: varOpenBeamHome,
    });
    expect(ownership.allowed).toBe(true);

    rmSync(varTempDir, { recursive: true, force: true });
  });

  it("reports repoRoot as the repository root for openbeam-owned worktrees", async () => {
    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "repo-root-check",
      openbeamHome,
    });

    const ownership = await isOpenBeamOwnedWorktreeCwd(result.worktreePath, {
      openbeamHome,
    });
    expect(ownership.allowed).toBe(true);
    expect(ownership.repoRoot).toBe(repoDir);
  });

  it("treats non-git directories as non-worktrees without throwing", async () => {
    const nonGitDir = join(tempDir, "not-a-repo");
    execSync(`mkdir -p ${nonGitDir}`);

    const ownership = await isOpenBeamOwnedWorktreeCwd(nonGitDir, {
      openbeamHome,
    });

    expect(ownership.allowed).toBe(false);
    expect(ownership.worktreePath).toBe(realpathSync(nonGitDir));
  });

  it("creates a worktree with a new branch", async () => {
    const projectHash = await deriveWorktreeProjectHash(repoDir);
    const result = await createWorktree({
      branchName: "feature-branch",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "my-feature",
      openbeamHome,
    });

    expect(result.worktreePath).toBe(
      join(openbeamHome, "worktrees", projectHash, "my-feature")
    );
    expect(existsSync(result.worktreePath)).toBe(true);

    // Verify branch was created
    const branches = execSync("git branch", { cwd: repoDir }).toString();
    expect(branches).toContain("feature-branch");
    const metadataPath = getOpenBeamWorktreeMetadataPath(result.worktreePath);
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    expect(metadata).toMatchObject({ version: 1, baseRefName: "main" });
  });

  it("fails with invalid branch name", async () => {
    await expect(
      createWorktree({
        branchName: "INVALID_UPPERCASE",
        cwd: repoDir,
        baseBranch: "main",
        worktreeSlug: "test",
      })
    ).rejects.toThrow("Invalid branch name");
  });

  it("handles branch name collision by adding suffix", async () => {
    const projectHash = await deriveWorktreeProjectHash(repoDir);
    // Create a branch named "hello" first
    execSync("git branch hello", { cwd: repoDir });

    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "hello",
      openbeamHome,
    });

    // Should create branch "hello-1" since "hello" exists
    expect(result.worktreePath).toBe(
      join(openbeamHome, "worktrees", projectHash, "hello")
    );
    expect(existsSync(result.worktreePath)).toBe(true);

    const branches = execSync("git branch", { cwd: repoDir }).toString();
    expect(branches).toContain("hello-1");
  });

  it("handles multiple collisions", async () => {
    // Create branches "hello" and "hello-1"
    execSync("git branch hello", { cwd: repoDir });
    execSync("git branch hello-1", { cwd: repoDir });

    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "hello",
      openbeamHome,
    });

    expect(existsSync(result.worktreePath)).toBe(true);

    const branches = execSync("git branch", { cwd: repoDir }).toString();
    expect(branches).toContain("hello-2");
  });

  it("runs setup commands from openbeam.json", async () => {
    // Create openbeam.json with setup commands
    const openbeamConfig = {
      worktree: {
        setup: [
          'echo "source=$OPENBEAM_SOURCE_CHECKOUT_PATH" > setup.log',
          'echo "root_alias=$OPENBEAM_ROOT_PATH" >> setup.log',
          'echo "worktree=$OPENBEAM_WORKTREE_PATH" >> setup.log',
          'echo "branch=$OPENBEAM_BRANCH_NAME" >> setup.log',
          'echo "port=$OPENBEAM_WORKTREE_PORT" >> setup.log',
        ],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add openbeam.json'",
      { cwd: repoDir }
    );

    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "setup-test",
      openbeamHome,
    });

    expect(existsSync(result.worktreePath)).toBe(true);

    // Verify setup ran and env vars were available
    const setupLog = readFileSync(
      join(result.worktreePath, "setup.log"),
      "utf8"
    );
    expect(setupLog).toContain(`source=${repoDir}`);
    expect(setupLog).toContain(`root_alias=${repoDir}`);
    expect(setupLog).toContain(`worktree=${result.worktreePath}`);
    expect(setupLog).toContain("branch=setup-test");
    const portLine = setupLog
      .split("\n")
      .find((line) => line.startsWith("port="));
    expect(portLine).toBeDefined();
    const portValue = Number(portLine?.slice("port=".length));
    expect(Number.isInteger(portValue)).toBe(true);
    expect(portValue).toBeGreaterThan(0);
  });

  it("does not run setup commands when runSetup=false", async () => {
    const openbeamConfig = {
      worktree: {
        setup: ['echo "setup ran" > setup.log'],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add openbeam.json'",
      { cwd: repoDir }
    );

    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "no-setup-test",
      runSetup: false,
      openbeamHome,
    });

    expect(existsSync(result.worktreePath)).toBe(true);
    expect(existsSync(join(result.worktreePath, "setup.log"))).toBe(false);
  });

  it("streams setup command progress events while commands are executing", async () => {
    const openbeamConfig = {
      worktree: {
        setup: ['echo "first line"; echo "second line" 1>&2'],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add streaming setup'",
      { cwd: repoDir }
    );

    const progressEvents: WorktreeSetupCommandProgressEvent[] = [];
    const results = await runWorktreeSetupCommands({
      worktreePath: repoDir,
      branchName: "main",
      cleanupOnFailure: false,
      onEvent: (event) => {
        progressEvents.push(event);
      },
    });

    expect(results).toHaveLength(1);
    expect(
      progressEvents.some((event) => event.type === "command_started")
    ).toBe(true);
    expect(progressEvents.some((event) => event.type === "output")).toBe(true);
    expect(
      progressEvents.some((event) => event.type === "command_completed")
    ).toBe(true);
  });

  it("reuses persisted worktree runtime port across resolutions", async () => {
    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "runtime-env-port-reuse",
      runSetup: false,
      openbeamHome,
    });

    const first = await resolveWorktreeRuntimeEnv({
      worktreePath: result.worktreePath,
      branchName: result.branchName,
    });
    const second = await resolveWorktreeRuntimeEnv({
      worktreePath: result.worktreePath,
      branchName: result.branchName,
    });

    expect(second.OPENBEAM_WORKTREE_PORT).toBe(first.OPENBEAM_WORKTREE_PORT);
  });

  it("fails runtime env resolution when persisted port is in use", async () => {
    const result = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "runtime-env-port-conflict",
      runSetup: false,
      openbeamHome,
    });

    const env = await resolveWorktreeRuntimeEnv({
      worktreePath: result.worktreePath,
      branchName: result.branchName,
    });
    const port = Number(env.OPENBEAM_WORKTREE_PORT);

    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => resolve());
    });

    await expect(
      resolveWorktreeRuntimeEnv({
        worktreePath: result.worktreePath,
        branchName: result.branchName,
      })
    ).rejects.toThrow(`Persisted worktree port ${port} is already in use`);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("cleans up worktree if setup command fails", async () => {
    // Create openbeam.json with failing setup command
    const openbeamConfig = {
      worktree: {
        setup: ["exit 1"],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add openbeam.json'",
      { cwd: repoDir }
    );

    const expectedWorktreePath = join(
      openbeamHome,
      "worktrees",
      "test-repo",
      "fail-test"
    );

    await expect(
      createWorktree({
        branchName: "main",
        cwd: repoDir,
        baseBranch: "main",
        worktreeSlug: "fail-test",
        openbeamHome,
      })
    ).rejects.toThrow("Worktree setup command failed");

    // Verify worktree was cleaned up
    expect(existsSync(expectedWorktreePath)).toBe(false);
  });

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  it("reads worktree terminal specs from openbeam.json with optional name", async () => {
    const openbeamConfig = {
      worktree: {
        terminals: [
          { name: "Dev Server", command: "npm run dev" },
          { command: "cd packages/app && npm run dev" },
        ],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );

    expect(getWorktreeTerminalSpecs(repoDir)).toEqual([
      { name: "Dev Server", command: "npm run dev" },
      { command: "cd packages/app && npm run dev" },
    ]);
  });

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  it("filters invalid worktree terminal specs", async () => {
    const openbeamConfig = {
      worktree: {
        terminals: [
          null,
          {},
          { name: "   ", command: "   " },
          { name: " Watch ", command: "npm run watch", cwd: "packages/app" },
          { name: 123, command: "npm run test" },
        ],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );

    expect(getWorktreeTerminalSpecs(repoDir)).toEqual([
      { name: "Watch", command: "npm run watch" },
      { command: "npm run test" },
    ]);
  });
});

describe("openbeam worktree manager", () => {
  let tempDir: string;
  let repoDir: string;
  let openbeamHome: string;

  beforeEach(() => {
    tempDir = realpathSync(
      mkdtempSync(join(tmpdir(), "worktree-manager-test-"))
    );
    repoDir = join(tempDir, "test-repo");
    openbeamHome = join(tempDir, "openbeam-home");

    execSync(`mkdir -p ${repoDir}`);
    execSync("git init -b main", { cwd: repoDir });
    execSync("git config user.email 'test@test.com'", { cwd: repoDir });
    execSync("git config user.name 'Test'", { cwd: repoDir });
    execSync("echo 'hello' > file.txt", { cwd: repoDir });
    execSync("git add .", { cwd: repoDir });
    execSync("git -c commit.gpgsign=false commit -m 'initial'", {
      cwd: repoDir,
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("isolates worktree roots for repositories that share the same directory name", async () => {
    const repoA = join(tempDir, "team-a", "test-repo");
    const repoB = join(tempDir, "team-b", "test-repo");

    for (const repo of [repoA, repoB]) {
      execSync(`mkdir -p ${repo}`);
      execSync("git init -b main", { cwd: repo });
      execSync("git config user.email 'test@test.com'", { cwd: repo });
      execSync("git config user.name 'Test'", { cwd: repo });
      execSync("echo 'hello' > file.txt", { cwd: repo });
      execSync("git add .", { cwd: repo });
      execSync("git -c commit.gpgsign=false commit -m 'initial'", {
        cwd: repo,
      });
    }

    const fromRepoA = await createWorktree({
      branchName: "main",
      cwd: repoA,
      baseBranch: "main",
      worktreeSlug: "alpha",
      openbeamHome,
    });
    const fromRepoB = await createWorktree({
      branchName: "main",
      cwd: repoB,
      baseBranch: "main",
      worktreeSlug: "alpha",
      openbeamHome,
    });

    expect(dirname(fromRepoA.worktreePath)).not.toBe(
      dirname(fromRepoB.worktreePath)
    );
    expect(fromRepoA.worktreePath.endsWith("alpha-1")).toBe(false);
    expect(fromRepoB.worktreePath.endsWith("alpha-1")).toBe(false);

    const repoAWorktrees = await listOpenBeamWorktrees({
      cwd: repoA,
      openbeamHome,
    });
    const repoBWorktrees = await listOpenBeamWorktrees({
      cwd: repoB,
      openbeamHome,
    });

    expect(repoAWorktrees.map((entry) => entry.path)).toEqual([
      fromRepoA.worktreePath,
    ]);
    expect(repoBWorktrees.map((entry) => entry.path)).toEqual([
      fromRepoB.worktreePath,
    ]);
  });

  it("lists and deletes openbeam worktrees under ~/.openbeam/worktrees/{hash}", async () => {
    const first = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "alpha",
      openbeamHome,
    });
    const second = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "beta",
      openbeamHome,
    });

    const worktrees = await listOpenBeamWorktrees({
      cwd: repoDir,
      openbeamHome,
    });
    const paths = worktrees.map((worktree) => worktree.path).sort();
    expect(paths).toEqual([first.worktreePath, second.worktreePath].sort());

    await deleteOpenBeamWorktree({
      cwd: repoDir,
      worktreePath: first.worktreePath,
      openbeamHome,
    });
    expect(existsSync(first.worktreePath)).toBe(false);

    const remaining = await listOpenBeamWorktrees({
      cwd: repoDir,
      openbeamHome,
    });
    expect(remaining.map((worktree) => worktree.path)).toEqual([
      second.worktreePath,
    ]);
  });

  it("deletes a openbeam worktree even when given a subdirectory path", async () => {
    const created = await createWorktree({
      branchName: "main",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "alpha",
      openbeamHome,
    });

    const nestedDir = join(created.worktreePath, "nested", "dir");
    execSync(`mkdir -p ${nestedDir}`);

    await deleteOpenBeamWorktree({
      cwd: repoDir,
      worktreePath: nestedDir,
      openbeamHome,
    });
    expect(existsSync(created.worktreePath)).toBe(false);

    const remaining = await listOpenBeamWorktrees({
      cwd: repoDir,
      openbeamHome,
    });
    expect(
      remaining.some((worktree) => worktree.path === created.worktreePath)
    ).toBe(false);
  });

  it("runs destroy commands from openbeam.json before deleting a worktree", async () => {
    const openbeamConfig = {
      worktree: {
        destroy: [
          'echo "source=$OPENBEAM_SOURCE_CHECKOUT_PATH" > "$OPENBEAM_SOURCE_CHECKOUT_PATH/destroy.log"',
          'echo "root_alias=$OPENBEAM_ROOT_PATH" >> "$OPENBEAM_SOURCE_CHECKOUT_PATH/destroy.log"',
          'echo "worktree=$OPENBEAM_WORKTREE_PATH" >> "$OPENBEAM_SOURCE_CHECKOUT_PATH/destroy.log"',
          'echo "branch=$OPENBEAM_BRANCH_NAME" >> "$OPENBEAM_SOURCE_CHECKOUT_PATH/destroy.log"',
        ],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add destroy commands'",
      { cwd: repoDir }
    );

    const created = await createWorktree({
      branchName: "destroy-branch",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "destroy-test",
      openbeamHome,
    });

    await deleteOpenBeamWorktree({
      cwd: repoDir,
      worktreePath: created.worktreePath,
      openbeamHome,
    });
    expect(existsSync(created.worktreePath)).toBe(false);

    const destroyLog = readFileSync(join(repoDir, "destroy.log"), "utf8");
    expect(destroyLog).toContain(`source=${repoDir}`);
    expect(destroyLog).toContain(`root_alias=${repoDir}`);
    expect(destroyLog).toContain(`worktree=${created.worktreePath}`);
    expect(destroyLog).toContain("branch=destroy-branch");
  });

  it("does not remove worktree when a destroy command fails", async () => {
    const openbeamConfig = {
      worktree: {
        destroy: [
          'echo "started" > "$OPENBEAM_SOURCE_CHECKOUT_PATH/destroy-start.log"',
          "echo boom 1>&2; exit 9",
        ],
      },
    };
    writeFileSync(
      join(repoDir, "openbeam.json"),
      JSON.stringify(openbeamConfig)
    );
    execSync(
      "git add openbeam.json && git -c commit.gpgsign=false commit -m 'add failing destroy commands'",
      { cwd: repoDir }
    );

    const created = await createWorktree({
      branchName: "destroy-failure-branch",
      cwd: repoDir,
      baseBranch: "main",
      worktreeSlug: "destroy-failure-test",
      openbeamHome,
    });

    await expect(
      deleteOpenBeamWorktree({
        cwd: repoDir,
        worktreePath: created.worktreePath,
        openbeamHome,
      })
    ).rejects.toThrow("Worktree destroy command failed");

    expect(existsSync(created.worktreePath)).toBe(true);
    expect(existsSync(join(repoDir, "destroy-start.log"))).toBe(true);
  });
});

describe("slugify", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("FOO_BAR")).toBe("foo-bar");
  });

  it("truncates long strings at word boundary", () => {
    const longInput =
      "https-stackoverflow-com-questions-68349031-only-run-actions-on-non-draft-pull-request";
    const result = slugify(longInput);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toBe("https-stackoverflow-com-questions-68349031-only");
  });

  it("truncates without trailing hyphen when no word boundary", () => {
    const longInput = "a".repeat(60);
    const result = slugify(longInput);
    expect(result.length).toBe(50);
    expect(result.endsWith("-")).toBe(false);
  });
});
