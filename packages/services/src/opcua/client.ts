import type {
  OpcUaConnectionConfig,
  OpcUaNode,
} from "@openbeam/types/services/connectors/opcua";
import { logger } from "../lib/logger";
import { OpcUaApiError } from "./types";

const DEFAULT_MAX_BROWSE_DEPTH = 5;
const DEFAULT_CONNECTION_TIMEOUT = 30_000;

interface OpcUaClientSession {
  browse(nodeIdOrDescriptor: unknown): Promise<{ references?: unknown[] }>;
  read(readValue: unknown): Promise<{ value: { value: unknown } }>;
  close(): Promise<void>;
}

interface OpcUaClientInstance {
  connect(endpointUrl: string): Promise<void>;
  createSession(userIdentity?: unknown): Promise<OpcUaClientSession>;
  disconnect(): Promise<void>;
}

interface OpcUaLibrary {
  OPCUAClient: {
    create(opts: Record<string, unknown>): OpcUaClientInstance;
  };
  MessageSecurityMode: Record<string, number>;
  SecurityPolicy: Record<string, string>;
  AttributeIds: {
    Value: number;
    BrowseName: number;
    DisplayName: number;
    NodeClass: number;
    Description: number;
  };
  BrowseDirection: { Forward: number };
  NodeClass: Record<string, number>;
  makeBrowsePath(rootFolder: string, browsePath: string): unknown;
}

function loadOpcUaLibrary(): OpcUaLibrary {
  return require("node-opcua-client") as OpcUaLibrary;
}

const NODE_CLASS_NAMES: Record<number, string> = {
  1: "Object",
  2: "Variable",
  4: "Method",
  8: "ObjectType",
  16: "VariableType",
  32: "ReferenceType",
  64: "DataType",
  128: "View",
};

function nodeClassName(nodeClass: number): string {
  return NODE_CLASS_NAMES[nodeClass] ?? `Unknown(${nodeClass})`;
}

export interface OpcUaClient {
  readonly connectorId: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  browseNode(nodeId: string): Promise<OpcUaNode[]>;
  browseTree(options: {
    rootNodeId?: string;
    maxDepth?: number;
  }): Promise<OpcUaNode[]>;
  readNodeValue(nodeId: string): Promise<unknown>;
  healthCheck(): Promise<boolean>;
}

export function createOpcUaClient(config: OpcUaConnectionConfig): OpcUaClient {
  const {
    connectorId,
    endpointUrl,
    security,
    connectionTimeout = DEFAULT_CONNECTION_TIMEOUT,
  } = config;

  let client: OpcUaClientInstance | null = null;
  let session: OpcUaClientSession | null = null;

  function ensureSession(): OpcUaClientSession {
    if (!session) {
      throw new OpcUaApiError({
        message: "OPC-UA session not established — call connect() first",
        code: "SESSION_EXPIRED",
        retryable: true,
      });
    }
    return session;
  }

  async function connect(): Promise<void> {
    const lib = loadOpcUaLibrary();

    const securityMode =
      lib.MessageSecurityMode[security?.securityMode ?? "None"] ?? 1;
    const securityPolicy =
      lib.SecurityPolicy[security?.securityPolicy ?? "None"] ?? "None";

    client = lib.OPCUAClient.create({
      applicationName: config.applicationName ?? "OpenBeam Gateway",
      connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 3,
        maxDelay: 10_000,
      },
      securityMode,
      securityPolicy,
      endpointMustExist: false,
      connectionTimeout,
    });

    try {
      await client.connect(endpointUrl);
    } catch (err) {
      client = null;
      throw new OpcUaApiError({
        message: `Failed to connect to OPC-UA server at ${endpointUrl}: ${err instanceof Error ? err.message : String(err)}`,
        code: "CONNECTION_FAILED",
        retryable: true,
      });
    }

    const userIdentity = buildUserIdentity(security);

    try {
      session = await client.createSession(userIdentity);
    } catch (err) {
      await client.disconnect().catch(() => null);
      client = null;
      throw new OpcUaApiError({
        message: `Failed to create OPC-UA session: ${err instanceof Error ? err.message : String(err)}`,
        code: "SESSION_EXPIRED",
        retryable: true,
      });
    }

    logger.info(
      { connectorId, endpoint: endpointUrl },
      "OPC-UA client connected"
    );
  }

  async function disconnect(): Promise<void> {
    if (session) {
      try {
        await session.close();
      } catch {
        logger.warn({ connectorId }, "Error closing OPC-UA session");
      }
      session = null;
    }

    if (client) {
      try {
        await client.disconnect();
      } catch {
        logger.warn({ connectorId }, "Error disconnecting OPC-UA client");
      }
      client = null;
    }

    logger.info({ connectorId }, "OPC-UA client disconnected");
  }

  async function browseNode(nodeId: string): Promise<OpcUaNode[]> {
    const currentSession = ensureSession();

    try {
      const browseResult = await currentSession.browse({
        nodeId,
        browseDirection: 0,
        includeSubtypes: true,
        resultMask: 63,
      });

      const references = browseResult.references ?? [];
      return references.map(toOpcUaNode);
    } catch (err) {
      throw new OpcUaApiError({
        message: `Failed to browse node ${nodeId}: ${err instanceof Error ? err.message : String(err)}`,
        code: "BROWSE_ERROR",
        retryable: false,
        nodeId,
      });
    }
  }

  async function browseTree(options: {
    rootNodeId?: string;
    maxDepth?: number;
  }): Promise<OpcUaNode[]> {
    const rootId = options.rootNodeId ?? "RootFolder";
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_BROWSE_DEPTH;
    const allNodes: OpcUaNode[] = [];
    const visited = new Set<string>();

    async function browseRecursive(
      nodeId: string,
      depth: number
    ): Promise<void> {
      if (depth > maxDepth || visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);

      const children = await browseNode(nodeId);
      for (const child of children) {
        allNodes.push(child);
        if (child.nodeClass === 1 && depth < maxDepth) {
          await browseRecursive(child.nodeId, depth + 1);
        }
      }
    }

    await browseRecursive(rootId, 0);
    return allNodes;
  }

  async function readNodeValue(nodeId: string): Promise<unknown> {
    const currentSession = ensureSession();

    try {
      const dataValue = await currentSession.read({
        nodeId,
        attributeId: 13,
      });
      return dataValue.value.value;
    } catch (err) {
      throw new OpcUaApiError({
        message: `Failed to read value for node ${nodeId}: ${err instanceof Error ? err.message : String(err)}`,
        code: "READ_ERROR",
        retryable: false,
        nodeId,
      });
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await browseNode("RootFolder");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    connect,
    disconnect,
    browseNode,
    browseTree,
    readNodeValue,
    healthCheck,
  };
}

function toOpcUaNode(ref: unknown): OpcUaNode {
  const r = ref as Record<string, unknown>;
  const nodeId = extractNodeId(r.nodeId);
  const browseName = extractQualifiedName(r.browseName);
  const displayName = extractLocalizedText(r.displayName);
  const nodeClass = typeof r.nodeClass === "number" ? r.nodeClass : 0;
  const typeDefinition = r.typeDefinition
    ? extractNodeId(r.typeDefinition)
    : undefined;

  return {
    nodeId,
    browseName,
    displayName: displayName || browseName,
    nodeClass,
    typeDefinition,
  };
}

function extractNodeId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return String(value);
}

function extractQualifiedName(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") {
      return obj.name;
    }
  }
  return String(value);
}

function extractLocalizedText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") {
      return obj.text;
    }
  }
  return String(value ?? "");
}

function buildUserIdentity(
  security?: OpcUaConnectionConfig["security"]
): unknown {
  if (!security?.username) {
    return null;
  }
  return {
    type: 1,
    userName: security.username,
    password: security.password ?? "",
  };
}

export { nodeClassName };
