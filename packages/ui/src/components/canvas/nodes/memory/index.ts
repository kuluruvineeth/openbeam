import { MemoryReadNode } from "./memory-read-node";
import { MemorySearchNode } from "./memory-search-node";
import { MemoryWriteNode } from "./memory-write-node";

export type { MemoryReadNodeData } from "./memory-read-node";
export { MemoryReadNode } from "./memory-read-node";

export type { MemorySearchNodeData } from "./memory-search-node";
export { MemorySearchNode } from "./memory-search-node";

export type { MemoryWriteNodeData } from "./memory-write-node";
export { MemoryWriteNode } from "./memory-write-node";

export const memoryNodeTypes = {
  memory_read: MemoryReadNode,
  memory_write: MemoryWriteNode,
  memory_search: MemorySearchNode,
} as const;
