/**
 * Tools Exports
 */

export {
  calculatorTool,
  unitConverterTool,
} from "./builtin/calculator";

// Built-in tools
export {
  findSimilarTool,
  getDocumentTool,
  searchTool,
} from "./builtin/search";
export {
  analyzeTextTool,
  currentDateTimeTool,
  parseUrlTool,
  validateJsonTool,
} from "./builtin/web";
// MCP adapter
export {
  allToolsToMCP,
  createMCPServer,
  importMCPServer,
  importMCPTool,
  mcpToolsToAISDK,
  toolToMCP,
} from "./mcp/adapter";
// Registry
export {
  defineTool,
  registerTool,
  ToolRegistry,
  toolRegistry,
} from "./registry";

// Types
export type {
  IMCPServer,
  IToolRegistry,
  MCPPropertySchema,
  MCPTool,
  ToolCall,
  ToolCallResult,
  ToolCategory,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
} from "./types";

import { calculatorTool, unitConverterTool } from "./builtin/calculator";
import { findSimilarTool, getDocumentTool, searchTool } from "./builtin/search";
import {
  analyzeTextTool,
  currentDateTimeTool,
  parseUrlTool,
  validateJsonTool,
} from "./builtin/web";
// Register built-in tools
import { toolRegistry } from "./registry";

/**
 * Initialize built-in tools
 */
export function initializeBuiltinTools(): void {
  // Search tools
  toolRegistry.register(searchTool);
  toolRegistry.register(getDocumentTool);
  toolRegistry.register(findSimilarTool);

  // Utility tools
  toolRegistry.register(calculatorTool);
  toolRegistry.register(unitConverterTool);
  toolRegistry.register(currentDateTimeTool);
  toolRegistry.register(parseUrlTool);
  toolRegistry.register(analyzeTextTool);
  toolRegistry.register(validateJsonTool);
}

// Auto-initialize on import
initializeBuiltinTools();
