import type {
  AggregationConfig,
  IndustrialTransformContext,
  TimeSeriesWindow,
} from "@openbeam/types/services/connectors/common/industrial";
import type { InternalMessage } from "@openbeam/types/services/connectors/mqtt";
import type { GenericDocument } from "@openbeam/vespa";
import logger from "../logger";
import { MessageAggregator } from "./aggregator";
import { DocumentBatcher } from "./batcher";
import { decodePayload } from "./decoder";
import { buildIsa95Metadata, buildIsa95Path, parseIsa95Path } from "./isa95";
import {
  transformEventMessage,
  transformTimeSeriesWindow,
} from "./transformer";

interface PipelineConfig {
  aggregation: AggregationConfig;
  pipeline: {
    batchSize: number;
    flushIntervalMs: number;
    maxQueueSize: number;
  };
}

interface PipelineMetrics {
  messagesDecoded: number;
  messagesDropped: number;
  documentsProduced: number;
  windowsFlushed: number;
}

type SubscriptionMeta = {
  payloadFormat: "json" | "sparkplug_b" | "cbor" | "raw";
  aggregationWindow?: number;
  unit?: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  sourceName: string;
};

interface RawMessageParams {
  connectorId: string;
  protocol: string;
  topic: string;
  payload: Buffer;
  format: "json" | "sparkplug_b" | "cbor" | "raw";
  qos: number;
  retain: boolean;
}

export class MessagePipeline {
  private readonly aggregator: MessageAggregator;
  private readonly batcher: DocumentBatcher;
  private readonly subscriptionMeta = new Map<string, SubscriptionMeta>();
  private readonly metrics: PipelineMetrics = {
    messagesDecoded: 0,
    messagesDropped: 0,
    documentsProduced: 0,
    windowsFlushed: 0,
  };

  constructor(
    config: PipelineConfig,
    onBatch: (documents: GenericDocument[]) => Promise<void>
  ) {
    this.aggregator = new MessageAggregator(
      config.aggregation,
      this.handleWindowFlush.bind(this)
    );

    this.batcher = new DocumentBatcher(
      {
        batchSize: config.pipeline.batchSize,
        flushIntervalMs: config.pipeline.flushIntervalMs,
        maxQueueSize: config.pipeline.maxQueueSize,
      },
      onBatch
    );
  }

  start(): void {
    this.batcher.start();
  }

  registerSubscription(topicPattern: string, meta: SubscriptionMeta): void {
    this.subscriptionMeta.set(topicPattern, meta);
  }

  process(message: InternalMessage): void {
    const meta = this.findSubscriptionMeta(message.topic);
    if (!meta) {
      this.metrics.messagesDropped += 1;
      return;
    }

    if (this.aggregator.shouldPassthrough(message)) {
      const ctx = this.buildTransformContext(message, meta);
      const doc = transformEventMessage(message, ctx);
      this.batcher.add(doc);
      this.metrics.documentsProduced += 1;
      return;
    }

    this.aggregator.process(message, meta.unit ?? "", meta.aggregationWindow);
    this.metrics.messagesDecoded += 1;
  }

  processRaw(params: RawMessageParams): void {
    const decoded = decodePayload(params.payload, params.format, params.topic);
    if (!decoded) {
      this.metrics.messagesDropped += 1;
      return;
    }

    this.process({
      connectorId: params.connectorId,
      protocol: params.protocol,
      topic: params.topic,
      payload: decoded,
      timestamp: Date.now(),
      qos: params.qos,
      retain: params.retain,
    });
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  getQueueDepth(): number {
    return this.batcher.queueDepth;
  }

  async destroy(): Promise<void> {
    this.aggregator.destroy();
    await this.batcher.destroy();
  }

  private handleWindowFlush(
    topic: string,
    connectorId: string,
    window: TimeSeriesWindow
  ): void {
    const meta = this.findSubscriptionMeta(topic);
    if (!meta) {
      return;
    }

    const isa95 = parseIsa95Path(topic);
    const ctx: IndustrialTransformContext = {
      connectorId,
      connectorType: meta.connectorType,
      teamId: meta.teamId,
      workspaceId: meta.workspaceId,
      protocol: "mqtt",
      sourceName: meta.sourceName,
      isa95Path: buildIsa95Path(isa95),
      isa95Labels: isa95.labels,
      isa95Metadata: buildIsa95Metadata(isa95),
      deviceName: isa95.device,
      metricName: isa95.datapoint,
      metricKey: `${connectorId}:${topic}`,
      metricType: meta.unit,
    };

    const doc = transformTimeSeriesWindow(window, ctx);
    this.batcher.add(doc);
    this.metrics.documentsProduced += 1;
    this.metrics.windowsFlushed += 1;

    logger.debug(
      { topic, sampleCount: window.sampleCount, connectorId },
      "Window flushed to document"
    );
  }

  private buildTransformContext(
    message: InternalMessage,
    meta: SubscriptionMeta
  ): IndustrialTransformContext {
    const isa95 = parseIsa95Path(message.topic);
    return {
      connectorId: message.connectorId,
      connectorType: meta.connectorType,
      teamId: meta.teamId,
      workspaceId: meta.workspaceId,
      protocol: message.protocol,
      sourceName: meta.sourceName,
      isa95Path: buildIsa95Path(isa95),
      isa95Labels: isa95.labels,
      isa95Metadata: buildIsa95Metadata(isa95),
      deviceName: isa95.device,
      metricName: isa95.datapoint,
      metricKey: `${message.connectorId}:${message.topic}`,
    };
  }

  private findSubscriptionMeta(topic: string): SubscriptionMeta | undefined {
    const exact = this.subscriptionMeta.get(topic);
    if (exact) {
      return exact;
    }

    for (const [pattern, meta] of this.subscriptionMeta) {
      if (matchMqttTopic(pattern, topic)) {
        return meta;
      }
    }

    return;
  }
}

function matchMqttTopic(pattern: string, topic: string): boolean {
  if (pattern === topic) {
    return true;
  }
  if (pattern === "#") {
    return true;
  }

  const patternParts = pattern.split("/");
  const topicParts = topic.split("/");

  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];

    if (p === "#") {
      return true;
    }
    if (p === "+") {
      if (i >= topicParts.length) {
        return false;
      }
      continue;
    }
    if (p !== topicParts[i]) {
      return false;
    }
  }

  return patternParts.length === topicParts.length;
}
