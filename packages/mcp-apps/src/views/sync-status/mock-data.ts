export type SyncJob = {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  status: string;
  progress?: number;
  processedDocs?: number;
  totalDocs?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

export const MOCK_SYNC_DATA: SyncJob[] = [
  {
    connectorId: "conn_slack_01",
    connectorName: "Slack - Engineering",
    connectorType: "slack",
    status: "SYNCING",
    progress: 64,
    processedDocs: 12_840,
    totalDocs: 20_000,
    startedAt: "2026-03-31T08:15:00Z",
  },
  {
    connectorId: "conn_notion_01",
    connectorName: "Notion - Product Wiki",
    connectorType: "notion",
    status: "COMPLETED",
    progress: 100,
    processedDocs: 3412,
    totalDocs: 3412,
    startedAt: "2026-03-31T06:00:00Z",
    completedAt: "2026-03-31T06:42:00Z",
  },
  {
    connectorId: "conn_github_01",
    connectorName: "GitHub - openbeam/core",
    connectorType: "github",
    status: "ERROR",
    progress: 31,
    processedDocs: 1550,
    totalDocs: 5000,
    startedAt: "2026-03-31T07:30:00Z",
    error: "Rate limit exceeded (403). Retry after 2026-03-31T09:00:00Z.",
  },
  {
    connectorId: "conn_gdrive_01",
    connectorName: "Google Drive - Shared",
    connectorType: "google_drive",
    status: "SYNCING",
    progress: 88,
    processedDocs: 8800,
    totalDocs: 10_000,
    startedAt: "2026-03-31T07:00:00Z",
  },
];
