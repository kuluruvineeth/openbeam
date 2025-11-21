/**
 * Connection Pool Manager
 * 
 * Manages reusable connections for connectors to improve performance.
 * Implements per-connector-type pooling with health checks.
 */

import type { ConnectorType } from "@openplane/db";
import { workerConfig } from "./config";
import logger from "./utils/logger";

interface PoolConfig {
  max: number;
  min: number;
}

interface PooledConnection<T> {
  connection: T;
  inUse: boolean;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Generic connection pool
 */
export class ConnectionPool<T> {
  private pool: Map<string, PooledConnection<T>[]> = new Map();
  private readonly config: PoolConfig;
  private readonly createConnection: () => Promise<T>;
  private readonly validateConnection: (conn: T) => Promise<boolean>;
  private readonly destroyConnection: (conn: T) => Promise<void>;

  constructor(
    config: PoolConfig,
    createFn: () => Promise<T>,
    validateFn: (conn: T) => Promise<boolean>,
    destroyFn: (conn: T) => Promise<void>
  ) {
    this.config = config;
    this.createConnection = createFn;
    this.validateConnection = validateFn;
    this.destroyConnection = destroyFn;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(key: string): Promise<T> {
    let connections = this.pool.get(key) || [];

    // Find available connection
    const available = connections.find((c) => !c.inUse);

    if (available) {
      // Validate connection before returning
      const isValid = await this.validateConnection(available.connection);
      if (isValid) {
        available.inUse = true;
        available.lastUsed = new Date();
        logger.debug({ key }, "Reusing pooled connection");
        return available.connection;
      } else {
        // Remove invalid connection
        await this.destroyConnection(available.connection);
        connections = connections.filter((c) => c !== available);
        this.pool.set(key, connections);
      }
    }

    // Create new connection if pool not full
    if (connections.length < this.config.max) {
      const connection = await this.createConnection();
      const pooled: PooledConnection<T> = {
        connection,
        inUse: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      };
      connections.push(pooled);
      this.pool.set(key, connections);
      logger.debug({ key, poolSize: connections.length }, "Created new pooled connection");
      return connection;
    }

    // Wait for connection to become available
    logger.warn({ key }, "Connection pool exhausted, waiting...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.acquire(key);
  }

  /**
   * Release a connection back to the pool
   */
  async release(key: string, connection: T): Promise<void> {
    const connections = this.pool.get(key) || [];
    const pooled = connections.find((c) => c.connection === connection);

    if (pooled) {
      pooled.inUse = false;
      pooled.lastUsed = new Date();
      logger.debug({ key }, "Released connection to pool");
    }
  }

  /**
   * Remove a connection from the pool
   */
  async remove(key: string, connection: T): Promise<void> {
    let connections = this.pool.get(key) || [];
    const pooled = connections.find((c) => c.connection === connection);

    if (pooled) {
      await this.destroyConnection(pooled.connection);
      connections = connections.filter((c) => c !== pooled);
      this.pool.set(key, connections);
      logger.debug({ key, poolSize: connections.length }, "Removed connection from pool");
    }
  }

  /**
   * Get pool statistics
   */
  getStats(key: string): { total: number; inUse: number; available: number } {
    const connections = this.pool.get(key) || [];
    return {
      total: connections.length,
      inUse: connections.filter((c) => c.inUse).length,
      available: connections.filter((c) => !c.inUse).length,
    };
  }

  /**
   * Close all connections in the pool
   */
  async closeAll(): Promise<void> {
    for (const [key, connections] of this.pool.entries()) {
      for (const pooled of connections) {
        await this.destroyConnection(pooled.connection);
      }
      logger.info({ key, count: connections.length }, "Closed all pooled connections");
    }
    this.pool.clear();
  }
}

/**
 * Connection pool manager for different connector types
 */
class ConnectionPoolManager {
  private pools = new Map<ConnectorType, ConnectionPool<any>>();

  /**
   * Get or create pool for connector type
   */
  getPool<T>(
    type: ConnectorType,
    createFn: () => Promise<T>,
    validateFn: (conn: T) => Promise<boolean>,
    destroyFn: (conn: T) => Promise<void>
  ): ConnectionPool<T> {
    if (!this.pools.has(type)) {
      const config = this.getPoolConfig(type);
      const pool = new ConnectionPool(config, createFn, validateFn, destroyFn);
      this.pools.set(type, pool);
      logger.info({ type, config }, "Created connection pool");
    }
    return this.pools.get(type)!;
  }

  /**
   * Get pool configuration for connector type
   */
  private getPoolConfig(type: ConnectorType): PoolConfig {
    switch (type) {
      case "SLACK":
        return workerConfig.connectionPool.slack;
      case "NOTION":
        return workerConfig.connectionPool.notion;
      case "DRIVE":
        return workerConfig.connectionPool.drive;
      default:
        return { max: 5, min: 1 };
    }
  }

  /**
   * Close all pools
   */
  async closeAll(): Promise<void> {
    for (const [type, pool] of this.pools.entries()) {
      await pool.closeAll();
      logger.info({ type }, "Closed connection pool");
    }
    this.pools.clear();
  }
}

export const connectionPoolManager = new ConnectionPoolManager();

