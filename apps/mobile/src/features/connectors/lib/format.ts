export function formatSyncTime(date: string | Date | null): string {
  if (!date) {
    return "Never";
  }
  const d = new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return d.toLocaleDateString();
}

export function formatDocumentCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

export function formatConnectorName(app: string): string {
  const names: Record<string, string> = {
    gmail: "Gmail",
    "google-drive": "Google Drive",
    slack: "Slack",
    notion: "Notion",
    linear: "Linear",
    jira: "Jira",
    confluence: "Confluence",
    github: "GitHub",
    asana: "Asana",
    intercom: "Intercom",
    zendesk: "Zendesk",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    dropbox: "Dropbox",
    onedrive: "OneDrive",
    sharepoint: "SharePoint",
    teams: "Microsoft Teams",
    outlook: "Outlook",
  };
  return names[app.toLowerCase()] ?? app.charAt(0).toUpperCase() + app.slice(1);
}

export function formatSyncDuration(ms: number | null): string {
  if (!ms) {
    return "-";
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
