import type { Connector, OAuthProvider } from "@openplane/db";
import type { GenericDocument } from "@openplane/vespa";

/**
 * Result of a sync operation
 */
export interface SyncResult {
  documents: GenericDocument[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Fetch result containing documents and pagination
 */
export interface FetchResult {
  documents: GenericDocument[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Abstract base class for all connectors
 * Each connector (Slack, Notion, Drive, etc.) extends this
 */
export abstract class BaseConnector {
  protected connector: Connector & { oauthProvider?: OAuthProvider | null };
  protected organizationId: string;

  constructor(connector: Connector & { oauthProvider?: OAuthProvider | null }) {
    this.connector = connector;
    this.organizationId = connector.organizationId;
  }

  /**
   * Main sync method - orchestrates fetching and transforming documents
   * @param cursor - Optional cursor for incremental sync
   */
  abstract sync(cursor?: string): Promise<SyncResult>;

  /**
   * Fetch documents from the external API
   * @param cursor - Optional cursor for pagination
   */
  abstract fetchDocuments(cursor?: string): Promise<FetchResult>;

  /**
   * Transform raw API response to GenericDocument
   * @param rawDoc - Raw document from external API
   */
  abstract transformToGenericDocument(rawDoc: unknown): GenericDocument;

  /**
   * Validate connector credentials and connection
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Get connector-specific metadata
   */
  getMetadata() {
    return {
      connectorId: this.connector.id,
      connectorType: this.connector.type,
      organizationId: this.organizationId,
      workspaceId: this.connector.workspaceExternalId,
    };
  }

  /**
   * Get decrypted credentials
   * Checks OAuth provider first, then falls back to connector config
   */
  protected getCredentials(): Record<string, unknown> {
    const credentials: Record<string, unknown> = {};

    // First, try to get credentials from OAuth provider (for OAuth-based connectors)
    if (this.connector.oauthProvider) {
      const oauth = this.connector.oauthProvider;
      if (oauth.accessToken) {
        credentials.accessToken = oauth.accessToken;
      }
      if (oauth.refreshToken) {
        credentials.refreshToken = oauth.refreshToken;
      }
      if (oauth.oauthScopes) {
        credentials.scopes = oauth.oauthScopes;
      }
      if (oauth.tokenExpiresAt) {
        credentials.tokenExpiresAt = oauth.tokenExpiresAt;
      }
    }

    // Then merge with config (for additional settings or API key auth)
    const config = this.connector.config as Record<string, unknown>;
    return { ...config, ...credentials };
  }
}
