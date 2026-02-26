import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const READ_ONLY_GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_OPTIONAL_LOCKS: "0",
};

export interface CheckoutStatusResult {
  isGit: boolean;
  repoRoot: string;
  currentBranch: string | null;
  isDaemonOwnedWorktree: boolean;
}

export type CheckoutContext = {
  openplaneHome?: string;
};

export async function getCheckoutStatus(
  cwd: string,
  context?: CheckoutContext
): Promise<CheckoutStatusResult> {
  try {
    const { stdout: root } = await execAsync("git rev-parse --show-toplevel", {
      cwd,
      env: READ_ONLY_GIT_ENV,
    });
    const repoRoot = root.trim();

    let currentBranch: string | null = null;
    try {
      const { stdout: branch } = await execAsync(
        "git symbolic-ref --short HEAD",
        { cwd, env: READ_ONLY_GIT_ENV }
      );
      currentBranch = branch.trim() || null;
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    } catch {}

    const isDaemonOwnedWorktree = await checkIsDaemonOwnedWorktree(
      cwd,
      context?.openplaneHome
    );

    return { isGit: true, repoRoot, currentBranch, isDaemonOwnedWorktree };
  } catch {
    return {
      isGit: false,
      repoRoot: cwd,
      currentBranch: null,
      isDaemonOwnedWorktree: false,
    };
  }
}

async function checkIsDaemonOwnedWorktree(
  cwd: string,
  _openplaneHome?: string
): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git rev-parse --git-common-dir", {
      cwd,
      env: READ_ONLY_GIT_ENV,
    });
    const commonDir = stdout.trim();
    const { stdout: gitDir } = await execAsync("git rev-parse --git-dir", {
      cwd,
      env: READ_ONLY_GIT_ENV,
    });
    return gitDir.trim() !== commonDir;
  } catch {
    return false;
  }
}

export async function renameCurrentBranch(
  cwd: string,
  newName: string
): Promise<{ previousBranch: string | null; currentBranch: string | null }> {
  let previousBranch: string | null = null;
  try {
    const { stdout } = await execAsync("git symbolic-ref --short HEAD", {
      cwd,
      env: READ_ONLY_GIT_ENV,
    });
    previousBranch = stdout.trim() || null;
  } catch {
    throw new Error("Cannot rename branch in detached HEAD state");
  }

  await execAsync(`git branch -m "${newName}"`, { cwd });

  let currentBranch: string | null = null;
  try {
    const { stdout } = await execAsync("git symbolic-ref --short HEAD", {
      cwd,
      env: READ_ONLY_GIT_ENV,
    });
    currentBranch = stdout.trim() || null;
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
  } catch {}

  return { previousBranch, currentBranch };
}

export function validateBranchSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!slug || slug.length === 0) {
    return { valid: false, error: "Branch name cannot be empty" };
  }

  if (slug.length > 100) {
    return {
      valid: false,
      error: "Branch name too long (max 100 characters)",
    };
  }

  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const validPattern = /^[a-z0-9-/]+$/;
  if (!validPattern.test(slug)) {
    return {
      valid: false,
      error:
        "Branch name must contain only lowercase letters, numbers, hyphens, and forward slashes",
    };
  }

  if (slug.startsWith("-") || slug.endsWith("-")) {
    return {
      valid: false,
      error: "Branch name must not start or end with a hyphen",
    };
  }

  if (slug.includes("--")) {
    return {
      valid: false,
      error: "Branch name must not contain consecutive hyphens",
    };
  }

  return { valid: true };
}
