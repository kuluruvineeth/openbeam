/**
 * Base Connector
 *
 * Abstract base class for all connectors with enhanced enterprise features:
 * - Entity extraction (people, projects, etc.)
 * - Relationship extraction (knowledge graph)
 * - Permission syncing
 * - Connection pooling
 * - Circuit breaker integration
 */
import type { Connector, OAuthProvider } from "@openplane/db";
import { type CircuitBreaker, getConnectorCircuit } from "@openplane/redis";
import type { GenericDocument } from "@openplane/vespa";
import { workerConfig } from "../config";
import { type ConnectionPool, connectionPoolManager } from "../connection-pool";

// === Types ===

/**
 * Result of a sync operation
 */
export interface SyncResult {
  documents: GenericDocument[];
  entities?: ExtractedEntity[];
  relationships?: ExtractedRelationship[];
  permissions?: ExtractedPermission[];
  nextCursor?: string;
  hasMore: boolean;
  stats?: SyncStats;
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
 * Extracted entity for knowledge graph
 */
export interface ExtractedEntity {
  externalId: string;
  entityType:
    | "person"
    | "project"
    | "channel"
    | "repository"
    | "team"
    | "group";
  name: string;
  email?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Extracted relationship for knowledge graph
 */
export interface ExtractedRelationship {
  sourceExternalId: string;
  sourceType: string;
  targetExternalId: string;
  targetType: string;
  relationshipType:
    | "authored"
    | "mentioned"
    | "references"
    | "works_on"
    | "member_of"
    | "owns"
    | "assigned_to"
    | "reviewed"
    | "commented"
    | "reacted";
  strength?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extracted permission for ACL sync
 */
export interface ExtractedPermission {
  resourceExternalId: string;
  resourceType: string;
  principalExternalId: string;
  principalType: "user" | "group";
  permission: "view" | "comment" | "edit" | "admin";
  inherited?: boolean;
  inheritedFrom?: string;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  documentsProcessed: number;
  entitiesExtracted: number;
  relationshipsExtracted: number;
  permissionsSynced: number;
  errors: number;
  durationMs: number;
}

// === Base Connector ===

/**
 * Abstract base class for all connectors
 * Each connector (Slack, Notion, Drive, etc.) extends this
 */
export abstract class BaseConnector {
  protected connector: Connector & { oauthProvider?: OAuthProvider | null };
  protected teamId: string;
  protected circuitBreaker: CircuitBreaker;
  private connectionPool?: ConnectionPool<unknown>;

  constructor(connector: Connector & { oauthProvider?: OAuthProvider | null }) {
    this.connector = connector;
    this.teamId = connector.teamId;
    this.circuitBreaker = getConnectorCircuit(connector.type);
  }

  // === Abstract Methods ===

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

  // === Entity Extraction (Optional - override in subclass) ===

  /**
   * Extract entities from documents for knowledge graph
   * @param documents - Documents to extract entities from
   */
  async extractEntities(
    _documents: GenericDocument[]
  ): Promise<ExtractedEntity[]> {
    // Default: no entity extraction
    return [];
  }

  /**
   * Fetch entities directly from the source (e.g., users, channels)
   */
  async fetchEntities(): Promise<ExtractedEntity[]> {
    // Default: no direct entity fetching
    return [];
  }

  // === Relationship Extraction (Optional - override in subclass) ===

  /**
   * Extract relationships from documents for knowledge graph
   * @param documents - Documents to extract relationships from
   * @param entities - Known entities for relationship mapping
   */
  async extractRelationships(
    _documents: GenericDocument[],
    _entities: ExtractedEntity[]
  ): Promise<ExtractedRelationship[]> {
    // Default: no relationship extraction
    return [];
  }

  // === Permission Syncing (Optional - override in subclass) ===

  /**
   * Fetch permissions for a resource
   * @param resourceExternalId - External ID of the resource
   * @param resourceType - Type of resource
   */
  async fetchPermissions(
    _resourceExternalId: string,
    _resourceType: string
  ): Promise<ExtractedPermission[]> {
    // Default: no permission syncing
    return [];
  }

  /**
   * Sync permissions for all resources
   */
  async syncPermissions(): Promise<ExtractedPermission[]> {
    // Default: no permission syncing
    return [];
  }

  /**
   * Check if the connector supports real-time permissions sync
   */
  supportsRealTimePermissions(): boolean {
    return false;
  }

  // === Access Control ===

  /**
   * Build access control list for a document
   * @param rawDoc - Raw document with permission info
   */
  protected buildAccessControlList(_rawDoc: unknown): string[] {
    // Default: document is accessible to all team members
    return [`team:${this.teamId}`];
  }

  /**
   * Determine if document is public
   * @param rawDoc - Raw document with permission info
   */
  protected isDocumentPublic(_rawDoc: unknown): boolean {
    return false;
  }

  // === Utility Methods ===

  /**
   * Get connector-specific metadata
   */
  getMetadata() {
    return {
      connectorId: this.connector.id,
      connectorType: this.connector.type,
      connectorApp: this.connector.app,
      teamId: this.teamId,
      workspaceId: this.connector.workspaceExternalId,
    };
  }

  /**
   * Get decrypted credentials
   * Checks OAuth provider first, then falls back to connector config
   */
  protected getCredentials(): Record<string, unknown> {
    const credentials: Record<string, unknown> = {};

    // First, try to get credentials from OAuth provider
    if (this.connector.oauthProvider) {
      const oauth = this.connector.oauthProvider;
      if (oauth.accessToken) credentials.accessToken = oauth.accessToken;
      if (oauth.refreshToken) credentials.refreshToken = oauth.refreshToken;
      if (oauth.oauthScopes) credentials.scopes = oauth.oauthScopes;
      if (oauth.tokenExpiresAt)
        credentials.tokenExpiresAt = oauth.tokenExpiresAt;
    }

    // Then merge with config
    const config = this.connector.config as Record<string, unknown>;
    return { ...config, ...credentials };
  }

  /**
   * Check if token needs refresh
   */
  protected needsTokenRefresh(): boolean {
    const oauth = this.connector.oauthProvider;
    if (!oauth?.tokenExpiresAt) return false;

    // Refresh if token expires in less than 5 minutes
    const expiresAt = new Date(oauth.tokenExpiresAt).getTime();
    return expiresAt - Date.now() < 5 * 60 * 1000;
  }

  /**
   * Get a pooled connection
   */
  protected async getPooledConnection<T>(
    createFn: () => Promise<T>,
    validateFn: (conn: T) => Promise<boolean>,
    destroyFn: (conn: T) => Promise<void>
  ): Promise<T> {
    if (!this.connectionPool) {
      this.connectionPool = connectionPoolManager.getPool(
        this.connector.type,
        createFn,
        validateFn,
        destroyFn
      ) as ConnectionPool<unknown>;
    }
    return await (this.connectionPool.acquire(this.connector.id) as Promise<T>);
  }

  /**
   * Release connection back to pool
   */
  protected async releasePooledConnection<T>(connection: T): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.release(this.connector.id, connection);
    }
  }

  /**
   * Remove connection from pool (on error)
   */
  protected async removePooledConnection<T>(connection: T): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.remove(this.connector.id, connection);
    }
  }

  /**
   * Execute with circuit breaker
   */
  protected async executeWithCircuitBreaker<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return await this.circuitBreaker.execute(fn);
  }

  /**
   * Get configured batch size for this connector
   */
  protected getBatchSize(): number {
    return workerConfig.batchSize.default;
  }

  /**
   * Generate a unique document ID
   */
  protected generateDocumentId(externalId: string): string {
    return `${this.connector.id}:${externalId}`;
  }

  // === Feature Flags ===

  /**
   * Check if entity extraction is enabled
   */
  protected isEntityExtractionEnabled(): boolean {
    return workerConfig.features.enableEntityExtraction;
  }

  /**
   * Check if relationship extraction is enabled
   */
  protected isRelationshipExtractionEnabled(): boolean {
    return workerConfig.features.enableRelationshipExtraction;
  }

  /**
   * Check if embeddings are enabled
   */
  protected isEmbeddingsEnabled(): boolean {
    return workerConfig.features.enableEmbeddings;
  }
}
