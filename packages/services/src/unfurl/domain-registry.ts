const CONNECTOR_DOMAINS: Record<string, string[]> = {
  NOTION: ["notion.so", "www.notion.so"],
  LINEAR: ["linear.app"],
  GITHUB: ["github.com"],
  JIRA: ["atlassian.net", "jira.com"],
  CONFLUENCE: ["atlassian.net", "confluence.atlassian.net"],
  GOOGLE_DRIVE: [
    "docs.google.com",
    "drive.google.com",
    "sheets.google.com",
    "slides.google.com",
  ],
  GMAIL: ["mail.google.com"],
  GOOGLE_CALENDAR: ["calendar.google.com"],
  SLACK: ["slack.com", "app.slack.com"],
  FIGMA: ["figma.com", "www.figma.com"],
  ASANA: ["app.asana.com"],
  HUBSPOT: ["app.hubspot.com"],
  ZENDESK: ["zendesk.com"],
  INTERCOM: ["app.intercom.com"],
  SALESFORCE: ["salesforce.com", "lightning.force.com"],
  DROPBOX: ["dropbox.com", "www.dropbox.com"],
  BOX: ["app.box.com"],
  SHAREPOINT: ["sharepoint.com"],
  TEAMS: ["teams.microsoft.com"],
  OUTLOOK: ["outlook.office.com", "outlook.office365.com"],
};

const DOMAIN_TO_CONNECTOR = new Map<string, string>();
for (const [connector, domains] of Object.entries(CONNECTOR_DOMAINS)) {
  for (const domain of domains) {
    DOMAIN_TO_CONNECTOR.set(domain, connector);
  }
}

export function getConnectorForDomain(domain: string): string | null {
  return DOMAIN_TO_CONNECTOR.get(domain) ?? null;
}

export function getAllUnfurlDomains(): string[] {
  return [...DOMAIN_TO_CONNECTOR.keys()];
}

export function isUnfurlableDomain(domain: string): boolean {
  return DOMAIN_TO_CONNECTOR.has(domain);
}
