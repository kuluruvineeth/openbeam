import type {
  OwaspDocument,
  OwaspProject,
} from "@openbeam/types/services/connectors/owasp";
import {
  OWASP_GITHUB_RAW_BASE,
  OWASP_REPOS,
} from "@openbeam/types/services/connectors/owasp";
import type { GitHubContentEntry, OwaspClient } from "../client";
import { OwaspApiError } from "../types";

const SKIP_FILENAMES = new Set([
  "README.md",
  "readme.md",
  "index.md",
  "INDEX.md",
  "SUMMARY.md",
  "_sidebar.md",
  "_navbar.md",
  "_footer.md",
  "_coverpage.md",
]);

const MD_EXTENSION_RE = /\.md$/;
const SEPARATOR_RE = /[-_]/g;
const CAMEL_CASE_RE = /([a-z])([A-Z])/g;
const LEADING_DIGITS_RE = /\b\d+\s*/;

function isMarkdownFile(entry: GitHubContentEntry): boolean {
  return (
    entry.type === "file" &&
    entry.name.endsWith(".md") &&
    !SKIP_FILENAMES.has(entry.name)
  );
}

interface RepoLocation {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

function buildDocumentUrl(loc: RepoLocation, filePath: string): string {
  return `${OWASP_GITHUB_RAW_BASE}/${loc.owner}/${loc.repo}/${loc.branch}/${filePath}`;
}

function filenameToTitle(filename: string): string {
  return filename
    .replace(MD_EXTENSION_RE, "")
    .replace(SEPARATOR_RE, " ")
    .replace(CAMEL_CASE_RE, "$1 $2")
    .replace(LEADING_DIGITS_RE, "")
    .trim();
}

async function listMarkdownFiles(
  client: OwaspClient,
  loc: RepoLocation
): Promise<GitHubContentEntry[]> {
  const entries = await client.listDirectory(loc);
  const markdownFiles: GitHubContentEntry[] = [];
  const subdirectories: GitHubContentEntry[] = [];

  for (const entry of entries) {
    if (isMarkdownFile(entry)) {
      markdownFiles.push(entry);
    } else if (entry.type === "dir") {
      subdirectories.push(entry);
    }
  }

  for (const dir of subdirectories) {
    const nested = await listMarkdownFiles(client, {
      ...loc,
      path: dir.path,
    });
    for (const file of nested) {
      markdownFiles.push(file);
    }
  }

  return markdownFiles;
}

export async function* fetchAllMarkdownFiles(
  client: OwaspClient,
  project: OwaspProject
): AsyncGenerator<OwaspDocument> {
  const config = OWASP_REPOS[project];
  const loc: RepoLocation = {
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    path: config.contentPath,
  };
  const files = await listMarkdownFiles(client, loc);

  for (const file of files) {
    try {
      const content = await client.fetchRawContent({
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        filePath: file.path,
      });

      yield {
        path: file.path,
        name: filenameToTitle(file.name),
        content,
        sha: file.sha,
        project,
        url: buildDocumentUrl(loc, file.path),
      };
    } catch (error) {
      if (error instanceof OwaspApiError && error.code === "RATE_LIMITED") {
        throw error;
      }
    }
  }
}
