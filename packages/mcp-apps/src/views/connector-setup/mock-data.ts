import type { AvailableConnector, SetupData } from "./types";

export const MOCK_CONNECTORS: AvailableConnector[] = [
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    shortDescription: "Messages, channels, threads, and files",
    authType: "OAUTH2",
    active: true,
    installed: false,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Knowledge Base",
    shortDescription: "Pages, databases, and wikis",
    authType: "OAUTH2",
    active: true,
    installed: false,
  },
  {
    id: "github",
    name: "GitHub",
    category: "Development",
    shortDescription: "Repositories, issues, PRs, and code",
    authType: "OAUTH2",
    active: true,
    installed: true,
  },
  {
    id: "linear",
    name: "Linear",
    category: "Project Management",
    shortDescription: "Issues, projects, and roadmaps",
    authType: "OAUTH2",
    active: true,
    installed: false,
  },
  {
    id: "confluence",
    name: "Confluence",
    category: "Knowledge Base",
    shortDescription: "Spaces, pages, and blog posts",
    authType: "API_KEY",
    active: true,
    installed: false,
    requiredFields: [
      {
        id: "domain",
        label: "Confluence Domain",
        type: "string",
        required: true,
        placeholder: "your-company.atlassian.net",
      },
      {
        id: "email",
        label: "Email",
        type: "string",
        required: true,
        placeholder: "user@company.com",
      },
      {
        id: "apiToken",
        label: "API Token",
        type: "password",
        required: true,
        placeholder: "Your Atlassian API token",
      },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    category: "Project Management",
    shortDescription: "Issues, boards, sprints, and projects",
    authType: "API_KEY",
    active: true,
    installed: false,
    requiredFields: [
      {
        id: "domain",
        label: "Jira Domain",
        type: "string",
        required: true,
        placeholder: "your-company.atlassian.net",
      },
      {
        id: "email",
        label: "Email",
        type: "string",
        required: true,
        placeholder: "user@company.com",
      },
      {
        id: "apiToken",
        label: "API Token",
        type: "password",
        required: true,
        placeholder: "Your Atlassian API token",
      },
    ],
  },
];

export const MOCK_OAUTH_SETUP: SetupData = {
  setupId: "setup_abc123",
  oauthUrl: "https://slack.com/oauth/v2/authorize?client_id=xxx&scope=xxx",
  app: { id: "slack", name: "Slack" },
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  status: "pending",
};

export const MOCK_SUCCESS_SETUP: SetupData = {
  setupId: "setup_abc123",
  connectorId: "conn_xyz789",
  app: { id: "slack", name: "Slack" },
  status: "completed",
};
