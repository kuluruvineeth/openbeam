/**
 * Google Connector Configuration
 * Covers Google Drive, Gmail, Calendar, etc.
 */

import type { OAuthConfig } from "../oauth";
import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

/**
 * Google OAuth Configuration
 */
export const googleOAuthConfig: OAuthConfig = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    // Drive
    "https://www.googleapis.com/auth/drive.readonly",
    // Gmail
    "https://www.googleapis.com/auth/gmail.readonly",
    // Calendar
    "https://www.googleapis.com/auth/calendar.readonly",
    // User info
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
};

/**
 * Google Drive App Configuration
 */
export const googleDriveApp: UnifiedApp = {
  id: AppType.GOOGLE_DRIVE,
  name: "Google Drive",
  category: "File Storage",
  active: true,
  logo: AppType.GOOGLE_DRIVE,
  short_description: "Search across documents, spreadsheets, and files.",
  description:
    "Connect Google Drive to search across all your documents, spreadsheets, presentations, and shared files. OpenPlane indexes content while respecting sharing permissions.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://drive.google.com",

  features: [
    "Full-text search across Docs, Sheets, and Slides",
    "Search file content, not just titles",
    "Respects sharing permissions automatically",
    "Real-time sync of changes",
    "Search shared drives and team drives",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: googleOAuthConfig.authUrl,
      tokenUrl: googleOAuthConfig.tokenUrl,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      redirectPath: "/connectors/oauth/google/callback",
    },
  },

  streams: [
    {
      name: "files",
      label: "Files & Documents",
      description: "All files in Drive",
      entityType: "resource",
      dataPoints: ["Name", "Content", "Owner", "Modified", "Sharing"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folder Structure",
      description: "Drive folder hierarchy",
      entityType: "resource",
      dataPoints: ["Name", "Path", "Parent"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "include_shared_drives",
      label: "Include Shared Drives",
      description: "Index files from shared/team drives.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "include_shared_with_me",
      label: "Include Shared With Me",
      description: "Index files shared with you by others.",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default googleDriveApp;
