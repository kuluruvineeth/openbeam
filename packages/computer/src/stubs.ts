import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { compile } from "json-schema-to-typescript";

const BINDING_DECLARATIONS = `
interface ToolCallResult {
  structuredContent?: unknown;
  content?: Array<{ text?: string }>;
  isError?: boolean;
}

declare namespace SecureExec {
  const bindings: {
    callTool: CallToolOverloads["callTool"];
    parseMcp: <T = any>(result: unknown) => T;
    generateText: (prompt: string, opts?: { system?: string; temperature?: number; maxTokens?: number; model?: string }) => Promise<string>;
    readMemory: (opts?: { key?: string; type?: string }) => Promise<Array<{ id: string; key: string; content: string; type: string | null; metadata: Record<string, unknown> | null; updatedAt: string }>>;
    writeMemory: (key: string, content: string, type?: string, metadata?: Record<string, unknown>) => Promise<{ success: true }>;
    getTrigger: () => { type: string; payload?: Record<string, unknown> };
    notify: (message: string, priority?: "low" | "normal" | "urgent") => Promise<{ success: true }>;
    propose: (actions: Array<{ tool: string; args: Record<string, unknown>; description?: string }>) => Promise<never>;
    callConnector: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
    searchContext: (query: string, opts?: { scope?: string; limit?: number }) => Promise<unknown[]>;
  };
}
declare const module: { exports: unknown };
`;

const SPLIT_PATTERN = /[_-]/;
const UNSAFE_CHARS = /[^a-zA-Z0-9]/g;

function sanitizeName(str: string): string {
  return str.replace(UNSAFE_CHARS, "_");
}

function toPascalCase(str: string): string {
  return sanitizeName(str)
    .split(SPLIT_PATTERN)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export async function generateTypeStubs(mcpClient: Client): Promise<string> {
  const { tools } = await mcpClient.listTools();

  const results = await Promise.all(
    tools.map(async (tool) => {
      const inputTypeName = `${toPascalCase(tool.name)}Input`;
      let iface: string;

      if (tool.inputSchema) {
        try {
          iface = await compile(
            tool.inputSchema as Record<string, unknown>,
            inputTypeName,
            { bannerComment: "", additionalProperties: false }
          );
        } catch {
          iface = `interface ${inputTypeName} { [key: string]: unknown; }`;
        }
      } else {
        iface = `interface ${inputTypeName} { [key: string]: unknown; }`;
      }

      const overload = `  callTool(name: "${tool.name}", args: ${inputTypeName}): Promise<ToolCallResult>;`;
      return { iface, overload };
    })
  );

  const interfaces = results.map((r) => r.iface);
  const overloads = results.map((r) => r.overload);

  const callToolInterface = [
    "interface CallToolOverloads {",
    ...overloads,
    "  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;",
    "}",
  ].join("\n");

  return [BINDING_DECLARATIONS, ...interfaces, callToolInterface].join("\n\n");
}
