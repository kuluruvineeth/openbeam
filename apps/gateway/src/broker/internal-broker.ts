import type { InternalMessage } from "@openbeam/types/services/connectors/mqtt";
import logger from "../logger";

const INTERNAL_PREFIX = "openbeam";

interface BrokerConfig {
  port: number;
  persistence: boolean;
}

type MessageHandler = (message: InternalMessage) => void;

interface AedesInstance {
  on(event: string, handler: (...args: unknown[]) => void): void;
  close(callback?: () => void): void;
  publish(
    packet: {
      topic: string;
      payload: Buffer;
      qos: number;
      retain: boolean;
    },
    callback?: (err?: Error) => void
  ): void;
}

export class InternalBroker {
  private aedes: AedesInstance | null = null;
  private server: {
    close: (callback?: () => void) => void;
    listen: (port: number, callback?: () => void) => void;
    on: (event: string, handler: (err: Error) => void) => void;
  } | null = null;
  private readonly config: BrokerConfig;
  private readonly handlers: MessageHandler[] = [];
  private clientCount = 0;

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  start(): Promise<void> {
    const Aedes = require("aedes") as new () => AedesInstance;
    const { createServer } = require("node:net") as typeof import("node:net");

    this.aedes = new Aedes();

    this.aedes.on("client", () => {
      this.clientCount += 1;
      logger.debug({ clients: this.clientCount }, "Broker client connected");
    });

    this.aedes.on("clientDisconnect", () => {
      this.clientCount -= 1;
      logger.debug({ clients: this.clientCount }, "Broker client disconnected");
    });

    this.aedes.on("publish", (...args: unknown[]) => {
      const packet = args[0] as {
        topic: string;
        payload: Buffer;
        qos: number;
        retain: boolean;
      };
      if (!packet.topic.startsWith(INTERNAL_PREFIX)) {
        return;
      }
      this.routeMessage(packet);
    });

    return new Promise((resolve, reject) => {
      const netServer = createServer(
        this.aedes as unknown as Parameters<typeof createServer>[0]
      );

      this.server = netServer;

      netServer.listen(this.config.port, () => {
        logger.info({ port: this.config.port }, "Internal MQTT broker started");
        resolve();
      });

      netServer.on("error", (err: Error) => {
        reject(err);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.aedes) {
        this.aedes.close(() => {
          if (this.server) {
            this.server.close(() => {
              logger.info("Internal MQTT broker stopped");
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  publish(message: InternalMessage): void {
    if (!this.aedes) {
      logger.warn("Broker not started, dropping message");
      return;
    }

    const internalTopic = buildInternalTopic(
      message.connectorId,
      message.protocol,
      message.topic
    );

    this.aedes.publish(
      {
        topic: internalTopic,
        payload: Buffer.from(JSON.stringify(message)),
        qos: message.qos as 0 | 1 | 2,
        retain: message.retain,
      },
      (err?: Error) => {
        if (err) {
          logger.error(
            { err, topic: internalTopic },
            "Failed to publish to internal broker"
          );
        }
      }
    );
  }

  getClientCount(): number {
    return this.clientCount;
  }

  private routeMessage(packet: {
    topic: string;
    payload: Buffer;
    qos: number;
    retain: boolean;
  }): void {
    try {
      const message = JSON.parse(
        packet.payload.toString("utf-8")
      ) as InternalMessage;
      for (const handler of this.handlers) {
        handler(message);
      }
    } catch (err) {
      logger.error(
        { err, topic: packet.topic },
        "Failed to parse internal message"
      );
    }
  }
}

export function buildInternalTopic(
  connectorId: string,
  protocol: string,
  originalTopic: string
): string {
  return `${INTERNAL_PREFIX}/${connectorId}/${protocol}/${originalTopic}`;
}

export function parseInternalTopic(topic: string): {
  connectorId: string;
  protocol: string;
  originalTopic: string;
} | null {
  if (!topic.startsWith(`${INTERNAL_PREFIX}/`)) {
    return null;
  }

  const rest = topic.substring(INTERNAL_PREFIX.length + 1);
  const firstSlash = rest.indexOf("/");
  if (firstSlash === -1) {
    return null;
  }

  const connectorId = rest.substring(0, firstSlash);
  const afterConnector = rest.substring(firstSlash + 1);
  const secondSlash = afterConnector.indexOf("/");
  if (secondSlash === -1) {
    return null;
  }

  const protocol = afterConnector.substring(0, secondSlash);
  const originalTopic = afterConnector.substring(secondSlash + 1);

  return { connectorId, protocol, originalTopic };
}
