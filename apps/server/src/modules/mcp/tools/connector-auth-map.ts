import {
  AirtableAuth,
  AsanaAuth,
  BitbucketAuth,
  BoxAuth,
  CanvaAuth,
  ClickUpAuth,
  ConfluenceAuth,
  DocuSignAuth,
  DropboxAuth,
  FigmaAuth,
  GitHubAuth,
  GitLabAuth,
  GmailAuth,
  GoogleCalendarAuth,
  GoogleChatAuth,
  GoogleDriveAuth,
  HubSpotAuth,
  IntercomAuth,
  JiraAuth,
  LinearAuth,
  MiroAuth,
  MondayAuth,
  NotionAuth,
  OutlookAuth,
  PipedriveAuth,
  SalesforceAuth,
  SlackAuth,
  ZendeskAuth,
  ZoomAuth,
} from "@openbeam/services";

export type OAuthAuthConstructor = new () => {
  start(ctx: {
    user: { id: string };
    workspaceId: string;
    connectorId: string;
    redirectUrl: string;
  }): Promise<string>;
};

export const AUTH_MAP: Record<string, OAuthAuthConstructor> = {
  AIRTABLE: AirtableAuth,
  ASANA: AsanaAuth,
  BITBUCKET: BitbucketAuth,
  BOX: BoxAuth,
  CANVA: CanvaAuth,
  CLICKUP: ClickUpAuth,
  CONFLUENCE: ConfluenceAuth,
  DOCUSIGN: DocuSignAuth,
  DROPBOX: DropboxAuth,
  FIGMA: FigmaAuth,
  GITHUB: GitHubAuth,
  GITLAB: GitLabAuth,
  GMAIL: GmailAuth,
  GOOGLE_CALENDAR: GoogleCalendarAuth,
  GOOGLE_CHAT: GoogleChatAuth,
  GOOGLE_DRIVE: GoogleDriveAuth,
  HUBSPOT: HubSpotAuth,
  INTERCOM: IntercomAuth,
  JIRA: JiraAuth,
  LINEAR: LinearAuth,
  MIRO: MiroAuth,
  MONDAY: MondayAuth,
  NOTION: NotionAuth,
  OUTLOOK: OutlookAuth,
  PIPEDRIVE: PipedriveAuth,
  SALESFORCE: SalesforceAuth,
  SLACK: SlackAuth,
  ZENDESK: ZendeskAuth,
  ZOOM: ZoomAuth,
};

export const SETUP_TTL_MS = 15 * 60 * 1000;
export const WEB_URL =
  process.env.OPENBEAM_WEB_URL || "https://app.openbeam.work";
