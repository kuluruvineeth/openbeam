/**
 * Pub/Sub Module
 *
 * Real-time event broadcasting for notifications, presence, and live updates.
 * Supports typed channels and message patterns.
 */
import IORedis from "ioredis";

// === Types ===

export type ChannelType =
  | "team" // Team-wide events
  | "user" // User-specific events
  | "connector" // Connector status updates
  | "conversation" // Chat updates
  | "document" // Document changes
  | "presence" // User presence
  | "notification" // User notifications
  | "system"; // System-wide broadcasts

export interface PubSubMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
}

// === Event Types ===

export interface TeamEvent {
  teamId: string;
  type:
    | "connector.status_changed"
    | "connector.sync_complete"
    | "user.joined"
    | "user.left"
    | "settings.changed";
  data: Record<string, unknown>;
}

export interface UserEvent {
  userId: string;
  type:
    | "notification.new"
    | "session.invalidated"
    | "permission.changed"
    | "preference.changed";
  data: Record<string, unknown>;
}

export interface ConversationEvent {
  conversationId: string;
  type:
    | "message.new"
    | "message.updated"
    | "typing.start"
    | "typing.stop"
    | "agent.step_complete";
  data: Record<string, unknown>;
}

export interface DocumentEvent {
  documentId: string;
  type: "updated" | "deleted" | "permission_changed";
  data: Record<string, unknown>;
}

export interface PresenceEvent {
  userId: string;
  type: "online" | "away" | "offline" | "page_change";
  data: {
    status?: string;
    page?: string;
    timestamp: number;
  };
}

// === Pub/Sub Manager ===

export class PubSubManager {
  private publisher: IORedis | null = null;
  private subscriber: IORedis | null = null;
  private subscriptions: Map<string, Set<(message: unknown) => void>> =
    new Map();
  private isConnected = false;

  /**
   * Initialize Redis connections for pub/sub
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    this.publisher = new IORedis(redisUrl, {
      lazyConnect: true,
      connectionName: "pubsub-publisher",
    });

    this.subscriber = new IORedis(redisUrl, {
      lazyConnect: true,
      connectionName: "pubsub-subscriber",
    });

    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);

    // Handle incoming messages
    this.subscriber.on("message", (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subscriber.on("pmessage", (_pattern, channel, message) => {
      this.handleMessage(channel, message);
    });

    this.isConnected = true;
    console.log("PubSub: Connected");
  }

  /**
   * Close connections
   */
  async disconnect(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.subscriptions.clear();
    this.isConnected = false;
    console.log("PubSub: Disconnected");
  }

  /**
   * Generate channel name
   */
  private getChannelName(type: ChannelType, id: string): string {
    return `openplane:${type}:${id}`;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(channel: string, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as PubSubMessage;
      const handlers = this.subscriptions.get(channel);

      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(message);
          } catch (error) {
            console.error("PubSub handler error:", error);
          }
        }
      }
    } catch (error) {
      console.error("PubSub parse error:", error);
    }
  }

  // === Publishing ===

  /**
   * Publish a message to a channel
   */
  async publish<T>(
    type: ChannelType,
    id: string,
    eventType: string,
    payload: T,
    source?: string
  ): Promise<void> {
    if (!this.publisher) {
      await this.connect();
    }

    const channel = this.getChannelName(type, id);
    const message: PubSubMessage<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
    };

    await this.publisher!.publish(channel, JSON.stringify(message));
  }

  /**
   * Publish team event
   */
  async publishTeamEvent(event: TeamEvent): Promise<void> {
    await this.publish("team", event.teamId, event.type, event.data);
  }

  /**
   * Publish user event
   */
  async publishUserEvent(event: UserEvent): Promise<void> {
    await this.publish("user", event.userId, event.type, event.data);
  }

  /**
   * Publish conversation event
   */
  async publishConversationEvent(event: ConversationEvent): Promise<void> {
    await this.publish(
      "conversation",
      event.conversationId,
      event.type,
      event.data
    );
  }

  /**
   * Publish document event
   */
  async publishDocumentEvent(event: DocumentEvent): Promise<void> {
    await this.publish("document", event.documentId, event.type, event.data);
  }

  /**
   * Publish presence event
   */
  async publishPresenceEvent(
    teamId: string,
    event: PresenceEvent
  ): Promise<void> {
    // Publish to team presence channel
    await this.publish("presence", teamId, event.type, event);
  }

  /**
   * Broadcast to all teams (system message)
   */
  async broadcastSystem(eventType: string, data: unknown): Promise<void> {
    await this.publish("system", "broadcast", eventType, data);
  }

  // === Subscribing ===

  /**
   * Subscribe to a channel
   */
  async subscribe<T>(
    type: ChannelType,
    id: string,
    handler: (message: PubSubMessage<T>) => void
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      await this.connect();
    }

    const channel = this.getChannelName(type, id);

    // Add handler
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      await this.subscriber!.subscribe(channel);
    }

    this.subscriptions.get(channel)!.add(handler as (message: unknown) => void);

    // Return unsubscribe function
    return async () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.delete(handler as (message: unknown) => void);
        if (handlers.size === 0) {
          this.subscriptions.delete(channel);
          await this.subscriber?.unsubscribe(channel);
        }
      }
    };
  }

  /**
   * Subscribe to pattern
   */
  async subscribePattern<T>(
    pattern: string,
    handler: (channel: string, message: PubSubMessage<T>) => void
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      await this.connect();
    }

    const fullPattern = `openplane:${pattern}`;

    // For pattern subscriptions, we need a different approach
    const wrappedHandler = (message: unknown) => {
      // This is simplified - in production you'd need to track the channel
      handler("", message as PubSubMessage<T>);
    };

    if (!this.subscriptions.has(fullPattern)) {
      this.subscriptions.set(fullPattern, new Set());
      await this.subscriber!.psubscribe(fullPattern);
    }

    this.subscriptions.get(fullPattern)!.add(wrappedHandler);

    return async () => {
      const handlers = this.subscriptions.get(fullPattern);
      if (handlers) {
        handlers.delete(wrappedHandler);
        if (handlers.size === 0) {
          this.subscriptions.delete(fullPattern);
          await this.subscriber?.punsubscribe(fullPattern);
        }
      }
    };
  }

  /**
   * Subscribe to team events
   */
  async subscribeToTeam(
    teamId: string,
    handler: (message: PubSubMessage<TeamEvent>) => void
  ): Promise<() => Promise<void>> {
    return await this.subscribe<TeamEvent>("team", teamId, handler);
  }

  /**
   * Subscribe to user events
   */
  async subscribeToUser(
    userId: string,
    handler: (message: PubSubMessage<UserEvent>) => void
  ): Promise<() => Promise<void>> {
    return await this.subscribe<UserEvent>("user", userId, handler);
  }

  /**
   * Subscribe to conversation events
   */
  async subscribeToConversation(
    conversationId: string,
    handler: (message: PubSubMessage<ConversationEvent>) => void
  ): Promise<() => Promise<void>> {
    return await this.subscribe<ConversationEvent>(
      "conversation",
      conversationId,
      handler
    );
  }

  /**
   * Subscribe to presence updates for a team
   */
  async subscribeToPresence(
    teamId: string,
    handler: (message: PubSubMessage<PresenceEvent>) => void
  ): Promise<() => Promise<void>> {
    return await this.subscribe<PresenceEvent>("presence", teamId, handler);
  }

  /**
   * Subscribe to system broadcasts
   */
  async subscribeToSystem(
    handler: (message: PubSubMessage<unknown>) => void
  ): Promise<() => Promise<void>> {
    return await this.subscribe<unknown>("system", "broadcast", handler);
  }
}

// Export singleton
export const pubsub = new PubSubManager();

// === Convenience Functions ===

/**
 * Notify user of new notification
 */
export async function notifyUser(
  userId: string,
  notification: Record<string, unknown>
): Promise<void> {
  await pubsub.publishUserEvent({
    userId,
    type: "notification.new",
    data: notification,
  });
}

/**
 * Broadcast connector status change
 */
export async function broadcastConnectorStatus(
  teamId: string,
  connectorId: string,
  status: string,
  details?: Record<string, unknown>
): Promise<void> {
  await pubsub.publishTeamEvent({
    teamId,
    type: "connector.status_changed",
    data: { connectorId, status, ...details },
  });
}

/**
 * Broadcast sync completion
 */
export async function broadcastSyncComplete(
  teamId: string,
  connectorId: string,
  stats: Record<string, unknown>
): Promise<void> {
  await pubsub.publishTeamEvent({
    teamId,
    type: "connector.sync_complete",
    data: { connectorId, ...stats },
  });
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  await pubsub.publishConversationEvent({
    conversationId,
    type: isTyping ? "typing.start" : "typing.stop",
    data: { userId },
  });
}
