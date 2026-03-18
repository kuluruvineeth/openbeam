import { z } from "@hono/zod-openapi";

const GithubIssueResponse = z.object({
  number: z.number(),
  html_url: z.string(),
});

const CATEGORY_PREFIX: Record<string, string> = {
  "data-request": "[Data]",
  bug: "[Bug]",
  enhancement: "[Feature]",
  "ux-feedback": "[Feedback]",
};

const CATEGORY_LABELS: Record<string, string[]> = {
  "data-request": ["data-request", "user-feedback"],
  bug: ["bug", "user-feedback"],
  enhancement: ["enhancement", "user-feedback"],
  "ux-feedback": ["ux-feedback", "user-feedback"],
};

const MAX_TITLE_LENGTH = 70;
const TITLE_TRUNCATE_LENGTH = 67;
const SENTENCE_SPLIT = /[.!?\n]/;

function generateTitle(text: string, category: string): string {
  const prefix = CATEGORY_PREFIX[category] ?? "[Feedback]";
  const firstSentence = text.split(SENTENCE_SPLIT)[0]?.trim() ?? text.trim();
  const title =
    firstSentence.length > MAX_TITLE_LENGTH
      ? `${firstSentence.slice(0, TITLE_TRUNCATE_LENGTH)}...`
      : firstSentence;
  return `${prefix} ${title}`;
}

function generateBody(
  text: string,
  page: string,
  inputMethod: string,
  context?: { lastQuery?: string; resultCount?: number; dataset?: string }
): string {
  const lines = [`> ${text}`, ""];
  if (page) {
    lines.push(`**Page:** ${page}`);
  }
  if (context?.lastQuery) {
    lines.push(`**Query:** ${context.lastQuery}`);
  }
  if (context?.resultCount != null) {
    lines.push(`**Results:** ${context.resultCount}`);
  }
  if (context?.dataset) {
    lines.push(`**Dataset:** ${context.dataset}`);
  }
  lines.push(`**Input:** ${inputMethod}`);
  return lines.join("\n");
}

export async function createFeedbackIssue(params: {
  text: string;
  category: string;
  page: string;
  inputMethod: string;
  context?: { lastQuery?: string; resultCount?: number; dataset?: string };
}): Promise<{ issueNumber: number; url: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_FEEDBACK_REPO;
  if (!(token && repo)) {
    throw new Error("GitHub feedback not configured");
  }

  const title = generateTitle(params.text, params.category);
  const body = generateBody(
    params.text,
    params.page,
    params.inputMethod,
    params.context
  );
  const labels = [
    ...(CATEGORY_LABELS[params.category] ?? ["user-feedback"]),
    params.inputMethod,
  ];

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  const issue = GithubIssueResponse.parse(await response.json());
  return { issueNumber: issue.number, url: issue.html_url };
}
