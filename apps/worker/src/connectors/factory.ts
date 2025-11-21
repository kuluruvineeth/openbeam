import type { Connector, OAuthProvider } from "@openplane/db";
import type { BaseConnector } from "./base-connector";
import { SlackConnector } from "./slack/connector";

/**
 * Factory to create connector instances based on app type
 */
export function createConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): BaseConnector {
  switch (connector.app) {
    case "SLACK":
      return new SlackConnector(connector);

    // Add more connectors here as we build them
    // case 'NOTION':
    //   return new NotionConnector(connector);
    // case 'GOOGLE_DRIVE':
    //   return new GoogleDriveConnector(connector);

    default:
      throw new Error(`Unsupported connector app: ${connector.app}`);
  }
}
