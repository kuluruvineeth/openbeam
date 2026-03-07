import type {
  AdapterMetrics,
  AggregationConfig,
  ConnectionState,
} from "@openbeam/types/services/connectors/common/industrial";
import type { InternalMessage } from "@openbeam/types/services/connectors/mqtt";

export interface SubscriptionConfig {
  topic: string;
  qos: number;
  payloadFormat: string;
  aggregationWindow?: number;
}

export interface AdapterConfig {
  connectorId: string;
  teamId: string;
  protocol: string;
  connection: Record<string, unknown>;
  subscriptions: SubscriptionConfig[];
  aggregation: AggregationConfig;
  onMessage: (message: InternalMessage) => void;
}

export interface ProtocolAdapter {
  readonly protocol: string;
  readonly connectorId: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  subscribe(subscriptions: SubscriptionConfig[]): Promise<void>;
  unsubscribe(topics: string[]): Promise<void>;

  getConnectionState(): ConnectionState;
  getMetrics(): AdapterMetrics;
}

export function createEmptyMetrics(): AdapterMetrics {
  return {
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesDropped: 0,
    lastMessageAt: 0,
    connectionUptime: 0,
    reconnectCount: 0,
    errorCount: 0,
  };
}
