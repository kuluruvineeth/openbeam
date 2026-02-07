"use client";

import type { ToolCategory } from "../components/agent/agent-tool-call";
import { type IconComponent, Icons } from "../components/icons";

interface ToolMetadata {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  icon: IconComponent;
}

const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  Bash: {
    name: "Bash",
    displayName: "Terminal",
    description: "Execute shell commands",
    category: "execute",
    icon: Icons.Terminal,
  },
  Read: {
    name: "Read",
    displayName: "Read File",
    description: "Read file contents",
    category: "read",
    icon: Icons.Eye,
  },
  Write: {
    name: "Write",
    displayName: "Write File",
    description: "Write file contents",
    category: "write",
    icon: Icons.Upload,
  },
  Edit: {
    name: "Edit",
    displayName: "Edit File",
    description: "Edit file with string replacement",
    category: "write",
    icon: Icons.Edit3,
  },
  Glob: {
    name: "Glob",
    displayName: "Find Files",
    description: "Search for files by pattern",
    category: "search",
    icon: Icons.FolderSearch,
  },
  Grep: {
    name: "Grep",
    displayName: "Search Content",
    description: "Search file contents",
    category: "search",
    icon: Icons.Search,
  },
  Task: {
    name: "Task",
    displayName: "Agent Task",
    description: "Launch sub-agent for complex tasks",
    category: "execute",
    icon: Icons.Zap,
  },
  TodoWrite: {
    name: "TodoWrite",
    displayName: "Todo List",
    description: "Manage task list",
    category: "write",
    icon: Icons.List,
  },
  WebFetch: {
    name: "WebFetch",
    displayName: "Fetch URL",
    description: "Fetch and analyze web content",
    category: "navigate",
    icon: Icons.Globe,
  },
  WebSearch: {
    name: "WebSearch",
    displayName: "Web Search",
    description: "Search the web",
    category: "search",
    icon: Icons.Search,
  },
  AskUserQuestion: {
    name: "AskUserQuestion",
    displayName: "Ask User",
    description: "Ask user for clarification",
    category: "navigate",
    icon: Icons.MessageSquare,
  },
  NotebookEdit: {
    name: "NotebookEdit",
    displayName: "Edit Notebook",
    description: "Edit Jupyter notebook cells",
    category: "write",
    icon: Icons.Code,
  },
  search_hybrid: {
    name: "search_hybrid",
    displayName: "Hybrid Search",
    description: "Search with semantic and keyword matching",
    category: "search",
    icon: Icons.Search,
  },
  search_semantic: {
    name: "search_semantic",
    displayName: "Semantic Search",
    description: "Search by meaning",
    category: "search",
    icon: Icons.Search,
  },
  doc_get: {
    name: "doc_get",
    displayName: "Get Document",
    description: "Retrieve document by ID",
    category: "read",
    icon: Icons.File,
  },
  doc_chunks: {
    name: "doc_chunks",
    displayName: "Get Chunks",
    description: "Get document chunks",
    category: "read",
    icon: Icons.Database,
  },
  connector_sync: {
    name: "connector_sync",
    displayName: "Sync Connector",
    description: "Trigger connector sync",
    category: "execute",
    icon: Icons.RefreshCw,
  },
  connector_list: {
    name: "connector_list",
    displayName: "List Connectors",
    description: "List available connectors",
    category: "read",
    icon: Icons.Settings,
  },
  rag_answer: {
    name: "rag_answer",
    displayName: "RAG Answer",
    description: "Generate grounded answer",
    category: "execute",
    icon: Icons.Zap,
  },
  mcp__github__create_pull_request: {
    name: "mcp__github__create_pull_request",
    displayName: "Create PR",
    description: "Create GitHub pull request",
    category: "write",
    icon: Icons.GitBranch,
  },
  mcp__github__list_pull_requests: {
    name: "mcp__github__list_pull_requests",
    displayName: "List PRs",
    description: "List GitHub pull requests",
    category: "read",
    icon: Icons.GitBranch,
  },
  mcp__github__search_code: {
    name: "mcp__github__search_code",
    displayName: "Search Code",
    description: "Search GitHub code",
    category: "search",
    icon: Icons.Search,
  },
};

const DEFAULT_TOOL: ToolMetadata = {
  name: "unknown",
  displayName: "Tool",
  description: "Unknown tool",
  category: "default",
  icon: Icons.ChevronRight,
};

function getToolMetadata(toolName: string): ToolMetadata {
  return (
    TOOL_REGISTRY[toolName] ?? {
      ...DEFAULT_TOOL,
      name: toolName,
      displayName: toolName,
    }
  );
}

function getToolIcon(toolName: string): IconComponent {
  return getToolMetadata(toolName).icon;
}

function getToolCategory(toolName: string): ToolCategory {
  return getToolMetadata(toolName).category;
}

function getToolDisplayName(toolName: string): string {
  return getToolMetadata(toolName).displayName;
}

const STATUS_ICONS: Record<string, IconComponent> = {
  pending: Icons.ChevronRight,
  running: Icons.Play,
  success: Icons.CheckCircle,
  error: Icons.AlertCircle,
};

function getStatusIcon(status: string): IconComponent {
  return STATUS_ICONS[status] ?? Icons.ChevronRight;
}

export {
  DEFAULT_TOOL,
  getStatusIcon,
  getToolCategory,
  getToolDisplayName,
  getToolIcon,
  getToolMetadata,
  TOOL_REGISTRY,
  type ToolMetadata,
};
