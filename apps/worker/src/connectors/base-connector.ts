import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import type { GenericDocument } from "@openplane/vespa";
import { type ConnectionPool, connectionPoolManager } from "../connection-pool";

export interface SyncResult {
  documents: GenericDocument[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface FetchResult {
  documents: GenericDocument[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface DecryptedCredentials {
  accessToken: string | null;
  refreshToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  scopes: string[];
  tokenExpiresAt: Date | null;
  isExpired: boolean;
  config: Record<string, unknown>;
}

export abstract class BaseConnector {
  protected connector: Connector & { oauthProvider?: OAuthProvider | null };
  protected teamId: string;
  private connectionPool?: ConnectionPool<unknown>;
  private _decryptedCredentials?: DecryptedCredentials;

  constructor(connector: Connector & { oauthProvider?: OAuthProvider | null }) {
    this.connector = connector;
    this.teamId = connector.teamId;
  }

  abstract sync(cursor?: string): Promise<SyncResult>;
  abstract fetchDocuments(cursor?: string): Promise<FetchResult>;
  abstract transformToGenericDocument(rawDoc: unknown): GenericDocument;
  abstract validateConnection(): Promise<boolean>;
  getMetadata() {
    return {
      connectorId: this.connector.id,
      connectorType: this.connector.type,
      teamId: this.teamId,
      workspaceId: this.connector.workspaceExternalId,
    };
  }

  protected getCredentials(): DecryptedCredentials {
    if (this._decryptedCredentials) {
      return this._decryptedCredentials;
    }

    const config = (this.connector.config as Record<string, unknown>) || {};
    const credentials: DecryptedCredentials = {
      accessToken: null,
      refreshToken: null,
      clientId: null,
      clientSecret: null,
      scopes: [],
      tokenExpiresAt: null,
      isExpired: false,
      config,
    };

    if (this.connector.oauthProvider) {
      const oauth = this.connector.oauthProvider;

      credentials.accessToken = decryptIfEncrypted(
        oauth.accessToken,
        oauth.accessTokenIv
      );
      credentials.refreshToken = decryptIfEncrypted(
        oauth.refreshToken,
        oauth.refreshTokenIv
      );
      credentials.clientSecret = decryptIfEncrypted(
        oauth.clientSecret,
        oauth.clientSecretIv
      );

      credentials.clientId = oauth.clientId;
      credentials.scopes = oauth.tokenScopes ?? oauth.oauthScopes ?? [];
      credentials.tokenExpiresAt = oauth.tokenExpiresAt;

      if (oauth.tokenExpiresAt) {
        credentials.isExpired = Date.now() >= oauth.tokenExpiresAt.getTime();
      }
    }

    if (this.connector.encryptedCredentials && this.connector.credentialsIv) {
      const decrypted = decryptIfEncrypted(
        this.connector.encryptedCredentials,
        this.connector.credentialsIv
      );

      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          credentials.config = { ...credentials.config, ...parsed };
        } catch {
          credentials.config = {
            ...credentials.config,
            encryptedCredentials: decrypted,
          };
        }
      }
    }

    this._decryptedCredentials = credentials;
    return credentials;
  }

  protected getAccessToken(): string {
    const credentials = this.getCredentials();

    if (!credentials.accessToken) {
      throw new Error("No access token available");
    }

    if (credentials.isExpired) {
      throw new Error("Access token has expired - refresh required");
    }

    return credentials.accessToken;
  }

  protected clearCredentialsCache(): void {
    this._decryptedCredentials = undefined;
  }

  protected async getPooledConnection<T>(
    createFn: () => Promise<T>,
    validateFn: (conn: T) => Promise<boolean>,
    destroyFn: (conn: T) => Promise<void>
  ): Promise<T> {
    if (!this.connectionPool) {
      this.connectionPool = connectionPoolManager.getPool(
        this.connector.app,
        createFn,
        validateFn,
        destroyFn
      ) as ConnectionPool<unknown>;
    }
    return await (this.connectionPool.acquire(this.connector.id) as Promise<T>);
  }

  protected async releasePooledConnection<T>(connection: T): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.release(this.connector.id, connection);
    }
  }

  protected async removePooledConnection<T>(connection: T): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.remove(this.connector.id, connection);
    }
  }
}
