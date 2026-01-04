import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface WorktreeConfig {
  repositoryPath: string;
  baseBranch?: string;
  branchPrefix?: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isLocked: boolean;
}

export interface Worktree {
  readonly path: string;
  readonly branch: string;

  checkout(ref: string): Promise<void>;
  commit(message: string, files?: string[]): Promise<string>;
  push(remote?: string): Promise<void>;
  diff(base?: string): Promise<string>;
  status(): Promise<string>;
  destroy(): Promise<void>;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function execGit(cwd: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (exitCode) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? 0,
      });
    });

    proc.on("error", reject);
  });
}

export class WorktreeManager {
  private readonly repoPath: string;
  private readonly worktreeRoot: string;
  private readonly branchPrefix: string;
  private readonly baseBranch: string;

  constructor(config: WorktreeConfig) {
    this.repoPath = config.repositoryPath;
    this.worktreeRoot = join(config.repositoryPath, ".worktrees");
    this.branchPrefix = config.branchPrefix ?? "agent";
    this.baseBranch = config.baseBranch ?? "main";
  }

  async initialize(): Promise<void> {
    try {
      await access(this.worktreeRoot);
    } catch {
      await mkdir(this.worktreeRoot, { recursive: true });
    }
  }

  async create(taskId?: string): Promise<Worktree> {
    const id = taskId ?? randomUUID().slice(0, 8);
    const branchName = `${this.branchPrefix}/${id}`;
    const worktreePath = join(this.worktreeRoot, id);

    await execGit(this.repoPath, ["fetch", "origin", this.baseBranch]);

    const createResult = await execGit(this.repoPath, [
      "worktree",
      "add",
      "-b",
      branchName,
      worktreePath,
      `origin/${this.baseBranch}`,
    ]);

    if (createResult.exitCode !== 0) {
      throw new Error(`Failed to create worktree: ${createResult.stderr}`);
    }

    return new WorktreeAdapter(worktreePath, branchName, this);
  }

  async list(): Promise<WorktreeInfo[]> {
    const result = await execGit(this.repoPath, [
      "worktree",
      "list",
      "--porcelain",
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to list worktrees: ${result.stderr}`);
    }

    const worktrees: WorktreeInfo[] = [];
    const entries = result.stdout.split("\n\n").filter(Boolean);

    for (const entry of entries) {
      const lines = entry.split("\n");
      const pathLine = lines.find((l) => l.startsWith("worktree "));
      const headLine = lines.find((l) => l.startsWith("HEAD "));
      const branchLine = lines.find((l) => l.startsWith("branch "));
      const isLocked = lines.some((l) => l === "locked");

      if (pathLine && headLine) {
        worktrees.push({
          path: pathLine.replace("worktree ", ""),
          head: headLine.replace("HEAD ", ""),
          branch: branchLine?.replace("branch refs/heads/", "") ?? "",
          isLocked,
        });
      }
    }

    return worktrees.filter((w) => w.path.startsWith(this.worktreeRoot));
  }

  async get(taskId: string): Promise<Worktree | null> {
    const worktrees = await this.list();
    const worktreePath = join(this.worktreeRoot, taskId);
    const worktree = worktrees.find((w) => w.path === worktreePath);

    if (!worktree) {
      return null;
    }

    return new WorktreeAdapter(worktree.path, worktree.branch, this);
  }

  async remove(taskId: string): Promise<void> {
    const worktreePath = join(this.worktreeRoot, taskId);

    await execGit(this.repoPath, [
      "worktree",
      "remove",
      "--force",
      worktreePath,
    ]);
  }

  async cleanup(): Promise<void> {
    await execGit(this.repoPath, ["worktree", "prune"]);

    const worktrees = await this.list();
    for (const worktree of worktrees) {
      try {
        await access(worktree.path);
      } catch {
        await this.remove(worktree.path.split("/").pop() ?? "");
      }
    }
  }

  getRepoPath(): string {
    return this.repoPath;
  }

  getBaseBranch(): string {
    return this.baseBranch;
  }
}

class WorktreeAdapter implements Worktree {
  readonly path: string;
  readonly branch: string;
  private readonly manager: WorktreeManager;

  constructor(path: string, branch: string, manager: WorktreeManager) {
    this.path = path;
    this.branch = branch;
    this.manager = manager;
  }

  async checkout(ref: string): Promise<void> {
    const result = await execGit(this.path, ["checkout", ref]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to checkout ${ref}: ${result.stderr}`);
    }
  }

  async commit(message: string, files?: string[]): Promise<string> {
    const filesToAdd = files ?? ["."];
    const addResult = await execGit(this.path, ["add", ...filesToAdd]);
    if (addResult.exitCode !== 0) {
      throw new Error(`Failed to stage files: ${addResult.stderr}`);
    }

    const statusResult = await execGit(this.path, ["status", "--porcelain"]);
    if (!statusResult.stdout.trim()) {
      throw new Error("No changes to commit");
    }

    const commitResult = await execGit(this.path, ["commit", "-m", message]);
    if (commitResult.exitCode !== 0) {
      throw new Error(`Failed to commit: ${commitResult.stderr}`);
    }

    const headResult = await execGit(this.path, ["rev-parse", "HEAD"]);
    return headResult.stdout;
  }

  async push(remote = "origin"): Promise<void> {
    const result = await execGit(this.path, [
      "push",
      "-u",
      remote,
      this.branch,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to push: ${result.stderr}`);
    }
  }

  async diff(base?: string): Promise<string> {
    const baseBranch = base ?? `origin/${this.manager.getBaseBranch()}`;
    const result = await execGit(this.path, ["diff", baseBranch]);
    return result.stdout;
  }

  async status(): Promise<string> {
    const result = await execGit(this.path, ["status", "--short"]);
    return result.stdout;
  }

  async destroy(): Promise<void> {
    const taskId = this.path.split("/").pop() ?? "";
    await this.manager.remove(taskId);

    const deleteResult = await execGit(this.manager.getRepoPath(), [
      "branch",
      "-D",
      this.branch,
    ]);

    if (deleteResult.exitCode !== 0) {
      // Branch may not exist, ignore
    }
  }
}

export function createWorktreeManager(config: WorktreeConfig): WorktreeManager {
  return new WorktreeManager(config);
}
