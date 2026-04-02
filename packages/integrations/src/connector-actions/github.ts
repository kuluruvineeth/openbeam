import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const githubActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "github",
  connectorName: "GitHub",
  connectorIcon: "github",
  actions: [
    {
      id: "issue_create",
      name: "Create Issue",
      description:
        "Create a new GitHub issue in a repository. Requires owner and repo name — use repository_get or search_documents to discover them. Returns the issue number and URL. Use when the user asks to create, file, or open a GitHub issue.",
      connectorType: "github",
      resource: "issue",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "owner",
          name: "Owner",
          type: "string",
          required: true,
          description:
            "Repository owner — GitHub user or organization name (e.g. 'openbeam-io').",
        },
        {
          id: "repo",
          name: "Repository",
          type: "string",
          required: true,
          description: "Repository name (e.g. 'openbeam').",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description:
            "Issue title — concise summary of the problem or request.",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: false,
          description:
            "Issue body in GitHub-flavored markdown. Supports headings, lists, code blocks, and task lists.",
        },
        {
          id: "labels",
          name: "Labels",
          type: "array",
          required: false,
          description:
            "Array of label names to apply (e.g. ['bug', 'high-priority']). Labels must already exist on the repo.",
        },
      ],
      outputs: [
        {
          id: "issueNumber",
          name: "Issue Number",
          type: "number",
          description:
            "Created issue number — use for issue_comment (e.g. #42).",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the issue on GitHub.",
        },
      ],
    },
    {
      id: "issue_comment",
      name: "Add Issue Comment",
      description:
        "Post a comment on a GitHub issue or pull request. Requires the owner, repo, and issue number — use issues_search to find the issue first. Use when the user asks to comment on or respond to an issue.",
      connectorType: "github",
      resource: "issue",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "owner",
          name: "Owner",
          type: "string",
          required: true,
          description: "Repository owner (user or organization).",
        },
        {
          id: "repo",
          name: "Repository",
          type: "string",
          required: true,
          description: "Repository name.",
        },
        {
          id: "issueNumber",
          name: "Issue Number",
          type: "number",
          required: true,
          description:
            "Issue or PR number (e.g. 42). Get from issue_create output or issues_search results.",
        },
        {
          id: "body",
          name: "Comment",
          type: "string",
          required: true,
          description: "Comment body in GitHub-flavored markdown.",
        },
      ],
      outputs: [
        {
          id: "commentId",
          name: "Comment ID",
          type: "number",
          description: "Created comment ID.",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the comment.",
        },
      ],
    },
    {
      id: "pull_request_create",
      name: "Create Pull Request",
      description:
        "Create a pull request between two branches in a GitHub repository. Requires owner, repo, head (source) branch, and base (target) branch. Returns the PR number and URL. Use when the user asks to open, create, or submit a pull request.",
      connectorType: "github",
      resource: "pull_request",
      category: "create",
      stakes: "high",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "owner",
          name: "Owner",
          type: "string",
          required: true,
          description: "Repository owner (user or organization).",
        },
        {
          id: "repo",
          name: "Repository",
          type: "string",
          required: true,
          description: "Repository name.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description: "Pull request title.",
        },
        {
          id: "head",
          name: "Head Branch",
          type: "string",
          required: true,
          description:
            "Source branch name containing the changes (e.g. 'feature/login-redesign').",
        },
        {
          id: "base",
          name: "Base Branch",
          type: "string",
          required: true,
          description: "Target branch to merge into (e.g. 'main', 'develop').",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: false,
          description:
            "Pull request description in GitHub-flavored markdown. Include context, screenshots, and testing notes.",
        },
      ],
      outputs: [
        {
          id: "pullRequestNumber",
          name: "PR Number",
          type: "number",
          description:
            "Created PR number — use for pull_request_comment (e.g. #99).",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the pull request on GitHub.",
        },
      ],
    },
    {
      id: "pull_request_comment",
      name: "Add Pull Request Comment",
      description:
        "Add a review comment to a GitHub pull request. Requires owner, repo, and PR number — use issues_search (PRs appear in issue search) to find it. Use when the user asks to review, comment on, or give feedback on a PR.",
      connectorType: "github",
      resource: "pull_request",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "owner",
          name: "Owner",
          type: "string",
          required: true,
          description: "Repository owner (user or organization).",
        },
        {
          id: "repo",
          name: "Repository",
          type: "string",
          required: true,
          description: "Repository name.",
        },
        {
          id: "pullRequestNumber",
          name: "PR Number",
          type: "number",
          required: true,
          description:
            "Pull request number. Get from pull_request_create output or issues_search results.",
        },
        {
          id: "body",
          name: "Comment",
          type: "string",
          required: true,
          description: "Comment content in GitHub-flavored markdown.",
        },
      ],
      outputs: [
        {
          id: "commentId",
          name: "Comment ID",
          type: "number",
          description: "Created comment ID.",
        },
      ],
    },
    {
      id: "issues_search",
      name: "Search Issues",
      description:
        "Search for GitHub issues and pull requests using GitHub's search syntax. Returns up to 30 results with number, title, state, and URL. Use this to find issues before commenting, updating, or referencing them.",
      connectorType: "github",
      resource: "issue",
      category: "search",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "query",
          name: "Query",
          type: "string",
          required: true,
          description:
            "GitHub search query. Supports qualifiers like 'repo:owner/name', 'is:open', 'is:pr', 'label:bug', 'author:username' (e.g. 'repo:openbeam-io/openbeam is:open label:bug').",
        },
        {
          id: "limit",
          name: "Limit",
          type: "number",
          required: false,
          description: "Max results to return (default 20, max 100).",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Items",
          type: "array",
          description:
            "Matching issues and pull requests with number, title, state, url, and labels.",
        },
        {
          id: "totalCount",
          name: "Total Count",
          type: "number",
          description: "Total number of matches found.",
        },
      ],
    },
    {
      id: "repository_get",
      name: "Get Repository",
      description:
        "Retrieve metadata for a GitHub repository including description, stars, language, and default branch. Use this to verify repository details before creating issues or pull requests.",
      connectorType: "github",
      resource: "repository",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "owner",
          name: "Owner",
          type: "string",
          required: true,
          description:
            "Repository owner — GitHub user or organization name (e.g. 'openbeam-io').",
        },
        {
          id: "repo",
          name: "Repository",
          type: "string",
          required: true,
          description: "Repository name (e.g. 'openbeam').",
        },
      ],
      outputs: [
        {
          id: "repository",
          name: "Repository",
          type: "object",
          description:
            "Repository details including name, description, language, default_branch, stars, and visibility.",
        },
      ],
    },
  ],
};
