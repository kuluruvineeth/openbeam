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
  canvas_add_node: {
    name: "canvas_add_node",
    displayName: "Add Node",
    description: "Add a node to the canvas",
    category: "write",
    icon: Icons.Plus,
  },
  canvas_create_node: {
    name: "canvas_create_node",
    displayName: "Create Node",
    description: "Create a new canvas node",
    category: "write",
    icon: Icons.Plus,
  },
  canvas_update_node: {
    name: "canvas_update_node",
    displayName: "Update Node",
    description: "Update an existing node",
    category: "write",
    icon: Icons.Edit3,
  },
  canvas_delete_nodes: {
    name: "canvas_delete_nodes",
    displayName: "Delete Nodes",
    description: "Delete canvas nodes",
    category: "write",
    icon: Icons.Trash,
  },
  canvas_move_nodes: {
    name: "canvas_move_nodes",
    displayName: "Move Nodes",
    description: "Move nodes to new positions",
    category: "write",
    icon: Icons.Move,
  },
  canvas_duplicate_nodes: {
    name: "canvas_duplicate_nodes",
    displayName: "Duplicate Nodes",
    description: "Duplicate selected nodes",
    category: "write",
    icon: Icons.Copy,
  },
  canvas_group_nodes: {
    name: "canvas_group_nodes",
    displayName: "Group Nodes",
    description: "Group nodes together",
    category: "write",
    icon: Icons.Layers,
  },
  canvas_ungroup_nodes: {
    name: "canvas_ungroup_nodes",
    displayName: "Ungroup Nodes",
    description: "Ungroup nodes",
    category: "write",
    icon: Icons.Layers,
  },
  canvas_create_connection: {
    name: "canvas_create_connection",
    displayName: "Connect Nodes",
    description: "Create a connection between nodes",
    category: "write",
    icon: Icons.ArrowRight,
  },
  canvas_update_connection: {
    name: "canvas_update_connection",
    displayName: "Update Connection",
    description: "Update an existing connection",
    category: "write",
    icon: Icons.ArrowRight,
  },
  canvas_delete_connections: {
    name: "canvas_delete_connections",
    displayName: "Delete Connections",
    description: "Delete connections between nodes",
    category: "write",
    icon: Icons.Trash,
  },
  canvas_reconnect: {
    name: "canvas_reconnect",
    displayName: "Reconnect",
    description: "Reconnect nodes",
    category: "write",
    icon: Icons.ArrowRight,
  },
  canvas_find_path: {
    name: "canvas_find_path",
    displayName: "Find Path",
    description: "Find path between nodes",
    category: "search",
    icon: Icons.Search,
  },
  canvas_auto_layout: {
    name: "canvas_auto_layout",
    displayName: "Auto Layout",
    description: "Automatically layout canvas nodes",
    category: "execute",
    icon: Icons.LayoutGrid,
  },
  canvas_align_nodes: {
    name: "canvas_align_nodes",
    displayName: "Align Nodes",
    description: "Align nodes on the canvas",
    category: "execute",
    icon: Icons.GanttChart,
  },
  canvas_distribute_nodes: {
    name: "canvas_distribute_nodes",
    displayName: "Distribute Nodes",
    description: "Distribute nodes evenly",
    category: "execute",
    icon: Icons.LayoutGrid,
  },
  canvas_get_state: {
    name: "canvas_get_state",
    displayName: "Read Canvas",
    description: "Read the current canvas state",
    category: "read",
    icon: Icons.Eye,
  },
  canvas_get_node: {
    name: "canvas_get_node",
    displayName: "Get Node",
    description: "Get a specific node",
    category: "read",
    icon: Icons.Eye,
  },
  canvas_query_nodes: {
    name: "canvas_query_nodes",
    displayName: "Query Nodes",
    description: "Query nodes by criteria",
    category: "search",
    icon: Icons.Search,
  },
  canvas_get_selection: {
    name: "canvas_get_selection",
    displayName: "Get Selection",
    description: "Get currently selected elements",
    category: "read",
    icon: Icons.Eye,
  },
  canvas_set_selection: {
    name: "canvas_set_selection",
    displayName: "Set Selection",
    description: "Set canvas selection",
    category: "write",
    icon: Icons.CheckCircle,
  },
  canvas_get_node_stats: {
    name: "canvas_get_node_stats",
    displayName: "Node Stats",
    description: "Get node statistics",
    category: "read",
    icon: Icons.BarChart,
  },
  canvas_validate_workflow: {
    name: "canvas_validate_workflow",
    displayName: "Validate",
    description: "Validate the workflow",
    category: "execute",
    icon: Icons.CheckCircle,
  },
  canvas_analyze_workflow: {
    name: "canvas_analyze_workflow",
    displayName: "Analyze",
    description: "Analyze the workflow",
    category: "execute",
    icon: Icons.Zap,
  },
  canvas_find_similar_nodes: {
    name: "canvas_find_similar_nodes",
    displayName: "Find Similar",
    description: "Find similar nodes",
    category: "search",
    icon: Icons.Search,
  },
  canvas_generate_workflow: {
    name: "canvas_generate_workflow",
    displayName: "Generate Workflow",
    description: "Generate a workflow from description",
    category: "execute",
    icon: Icons.Zap,
  },
  canvas_suggest_next_node: {
    name: "canvas_suggest_next_node",
    displayName: "Suggest Next",
    description: "Suggest the next node to add",
    category: "execute",
    icon: Icons.Zap,
  },
  canvas_generate_from_template: {
    name: "canvas_generate_from_template",
    displayName: "From Template",
    description: "Generate from a template",
    category: "execute",
    icon: Icons.Zap,
  },
  canvas_save_as_template: {
    name: "canvas_save_as_template",
    displayName: "Save Template",
    description: "Save workflow as template",
    category: "write",
    icon: Icons.Upload,
  },
  canvas_apply_template: {
    name: "canvas_apply_template",
    displayName: "Apply Template",
    description: "Apply a template to the canvas",
    category: "execute",
    icon: Icons.Zap,
  },
  canvas_list_templates: {
    name: "canvas_list_templates",
    displayName: "List Templates",
    description: "List available templates",
    category: "read",
    icon: Icons.List,
  },
  canvas_export_workflow: {
    name: "canvas_export_workflow",
    displayName: "Export",
    description: "Export the workflow",
    category: "write",
    icon: Icons.Download,
  },
  canvas_import_workflow: {
    name: "canvas_import_workflow",
    displayName: "Import",
    description: "Import a workflow",
    category: "read",
    icon: Icons.Upload,
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
