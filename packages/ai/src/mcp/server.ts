import type {
  InitializeParams,
  InitializeResult,
  MCPCapabilities,
  MCPError,
  MCPNotification,
  MCPRequest,
  MCPRequestMethod,
  MCPResponse,
  MCPServerContext,
  MCPServerOptions,
  PromptsGetParams,
  PromptsListResult,
  ResourcesListResult,
  ResourcesReadParams,
  ToolsCallParams,
  ToolsListResult,
} from "@openplane/types/ai";
import type { ToolRegistry } from "../tools/registry";
import { MCPToolBridge } from "./bridge";
import { PromptRegistry } from "./prompts";
import { ResourceRegistry } from "./resources";
import { MCP_ERROR_CODES } from "./types";

const PROTOCOL_VERSION = "2024-11-05";

interface MCPServerState {
  initialized: boolean;
  clientInfo?: { name: string; version: string };
  negotiatedCapabilities: MCPCapabilities;
}

export class MCPServer {
  private readonly name: string;
  private readonly version: string;
  private readonly capabilities: MCPCapabilities;
  private readonly resourceRegistry: ResourceRegistry;
  private readonly promptRegistry: PromptRegistry;
  private readonly toolBridge: MCPToolBridge;
  private readonly state: MCPServerState;
  private readonly notificationHandlers = new Map<
    string,
    (params: unknown) => void
  >();

  constructor(toolRegistry: ToolRegistry, options: MCPServerOptions) {
    this.name = options.name;
    this.version = options.version;
    this.capabilities = {
      tools: true,
      resources: true,
      prompts: true,
      logging: options.capabilities?.logging ?? false,
      sampling: options.capabilities?.sampling ?? false,
    };
    this.resourceRegistry = new ResourceRegistry();
    this.promptRegistry = new PromptRegistry();
    this.toolBridge = new MCPToolBridge(toolRegistry);
    this.state = {
      initialized: false,
      negotiatedCapabilities: this.capabilities,
    };
  }

  getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }

  getPromptRegistry(): PromptRegistry {
    return this.promptRegistry;
  }

  getToolBridge(): MCPToolBridge {
    return this.toolBridge;
  }

  async handleRequest(
    request: MCPRequest,
    context: MCPServerContext
  ): Promise<MCPResponse> {
    try {
      const result = await this.routeRequest(
        request.method,
        request.params,
        context
      );
      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      return this.createErrorResponse(request.id, this.classifyError(error));
    }
  }

  handleNotification(
    notification: MCPNotification,
    _context: MCPServerContext
  ): void {
    const handler = this.notificationHandlers.get(notification.method);
    if (handler) {
      handler(notification.params);
    }
  }

  onNotification(
    method: string,
    handler: (params: unknown) => void
  ): () => void {
    this.notificationHandlers.set(method, handler);
    return () => this.notificationHandlers.delete(method);
  }

  private async routeRequest(
    method: MCPRequestMethod,
    params: unknown,
    context: MCPServerContext
  ): Promise<unknown> {
    switch (method) {
      case "initialize":
        return this.handleInitialize(params as InitializeParams);

      case "initialized":
        return this.handleInitialized();

      case "ping":
        return this.handlePing();

      case "tools/list":
        return this.handleToolsList();

      case "tools/call":
        return await this.handleToolsCall(params as ToolsCallParams, context);

      case "resources/list":
        return this.handleResourcesList();

      case "resources/templates/list":
        return this.handleResourceTemplatesList();

      case "resources/read":
        return await this.handleResourcesRead(
          params as ResourcesReadParams,
          context
        );

      case "prompts/list":
        return this.handlePromptsList();

      case "prompts/get":
        return await this.handlePromptsGet(params as PromptsGetParams, context);

      default:
        throw this.createError(
          MCP_ERROR_CODES.METHOD_NOT_FOUND,
          `Method not found: ${method}`
        );
    }
  }

  private handleInitialize(params: InitializeParams): InitializeResult {
    if (this.state.initialized) {
      throw this.createError(
        MCP_ERROR_CODES.INVALID_REQUEST,
        "Server already initialized"
      );
    }

    this.state.clientInfo = params.clientInfo;
    this.state.negotiatedCapabilities = this.negotiateCapabilities(
      params.capabilities
    );
    this.state.initialized = true;

    return {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: this.state.negotiatedCapabilities,
      serverInfo: {
        name: this.name,
        version: this.version,
      },
    };
  }

  private handleInitialized(): Record<string, never> {
    return {};
  }

  private handlePing(): { pong: true } {
    return { pong: true };
  }

  private handleToolsList(): ToolsListResult {
    const tools = this.toolBridge.listTools();
    return { tools };
  }

  private handleToolsCall(
    params: ToolsCallParams,
    context: MCPServerContext
  ): Promise<unknown> {
    this.requireInitialized();
    this.requireCapability("tools");

    if (!this.toolBridge.hasTool(params.name)) {
      throw this.createError(
        MCP_ERROR_CODES.TOOL_NOT_FOUND,
        `Tool not found: ${params.name}`
      );
    }

    return this.toolBridge.executeTool(
      { name: params.name, arguments: params.arguments ?? {} },
      context
    );
  }

  private handleResourcesList(): ResourcesListResult {
    this.requireInitialized();
    this.requireCapability("resources");

    return { resources: this.resourceRegistry.list() };
  }

  private handleResourceTemplatesList(): { resourceTemplates: unknown[] } {
    this.requireInitialized();
    this.requireCapability("resources");

    return { resourceTemplates: this.resourceRegistry.listTemplates() };
  }

  private async handleResourcesRead(
    params: ResourcesReadParams,
    context: MCPServerContext
  ): Promise<unknown> {
    this.requireInitialized();
    this.requireCapability("resources");

    const result = await this.resourceRegistry.read(params.uri, context);
    if (!result) {
      throw this.createError(
        MCP_ERROR_CODES.RESOURCE_NOT_FOUND,
        `Resource not found: ${params.uri}`
      );
    }

    return result;
  }

  private handlePromptsList(): PromptsListResult {
    this.requireInitialized();
    this.requireCapability("prompts");

    return { prompts: this.promptRegistry.list() };
  }

  private async handlePromptsGet(
    params: PromptsGetParams,
    context: MCPServerContext
  ): Promise<unknown> {
    this.requireInitialized();
    this.requireCapability("prompts");

    const result = await this.promptRegistry.get(
      params.name,
      params.arguments ?? {},
      context
    );
    if (!result) {
      throw this.createError(
        MCP_ERROR_CODES.PROMPT_NOT_FOUND,
        `Prompt not found: ${params.name}`
      );
    }

    return result;
  }

  private negotiateCapabilities(
    clientCapabilities: Partial<MCPCapabilities>
  ): MCPCapabilities {
    return {
      tools: this.capabilities.tools && (clientCapabilities.tools ?? true),
      resources:
        this.capabilities.resources && (clientCapabilities.resources ?? true),
      prompts:
        this.capabilities.prompts && (clientCapabilities.prompts ?? true),
      logging: this.capabilities.logging && clientCapabilities.logging,
      sampling: this.capabilities.sampling && clientCapabilities.sampling,
    };
  }

  private requireInitialized(): void {
    if (!this.state.initialized) {
      throw this.createError(
        MCP_ERROR_CODES.INVALID_REQUEST,
        "Server not initialized"
      );
    }
  }

  private requireCapability(capability: keyof MCPCapabilities): void {
    if (!this.state.negotiatedCapabilities[capability]) {
      throw this.createError(
        MCP_ERROR_CODES.INVALID_REQUEST,
        `Capability not enabled: ${capability}`
      );
    }
  }

  private createSuccessResponse(
    id: string | number,
    result: unknown
  ): MCPResponse {
    return { jsonrpc: "2.0", id, result };
  }

  private createErrorResponse(
    id: string | number,
    error: MCPError
  ): MCPResponse {
    return { jsonrpc: "2.0", id, error };
  }

  private createError(code: number, message: string, data?: unknown): MCPError {
    return { code, message, data };
  }

  private classifyError(error: unknown): MCPError {
    if (isMCPError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return {
        code: MCP_ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
      };
    }

    return {
      code: MCP_ERROR_CODES.INTERNAL_ERROR,
      message: "Unknown error",
    };
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }

  getClientInfo(): { name: string; version: string } | undefined {
    return this.state.clientInfo;
  }

  getNegotiatedCapabilities(): MCPCapabilities {
    return { ...this.state.negotiatedCapabilities };
  }

  reset(): void {
    this.state.initialized = false;
    this.state.clientInfo = undefined;
    this.state.negotiatedCapabilities = this.capabilities;
  }
}

function isMCPError(value: unknown): value is MCPError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.code === "number" && typeof obj.message === "string";
}

export function createMCPServer(
  toolRegistry: ToolRegistry,
  options: MCPServerOptions
): MCPServer {
  return new MCPServer(toolRegistry, options);
}

export function createRequest<T>(
  method: MCPRequestMethod,
  params?: T,
  id?: string | number
): MCPRequest<T> {
  return {
    jsonrpc: "2.0",
    id: id ?? crypto.randomUUID(),
    method,
    params,
  };
}

export function createNotification<T>(
  method: string,
  params?: T
): MCPNotification<T> {
  return {
    jsonrpc: "2.0",
    method,
    params,
  };
}

export function isValidRequest(message: unknown): message is MCPRequest {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const obj = message as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    typeof obj.method === "string"
  );
}

export function isValidNotification(
  message: unknown
): message is MCPNotification {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const obj = message as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" && typeof obj.method === "string" && !("id" in obj)
  );
}

export function parseMessage(
  json: string
): MCPRequest | MCPNotification | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (isValidRequest(parsed)) {
      return parsed;
    }
    if (isValidNotification(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
