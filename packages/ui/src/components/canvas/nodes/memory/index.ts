import { MemoryReadNode } from "./memory-read-node";
import { MemorySearchNode } from "./memory-search-node";
import { MemoryWriteNode } from "./memory-write-node";

export type { MemoryReadNodeData } from "./memory-read-node";
export { createMemoryReadNodeData, MemoryReadNode } from "./memory-read-node";

export type { MemorySearchNodeData } from "./memory-search-node";
export {
  createMemorySearchNodeData,
  MemorySearchNode,
} from "./memory-search-node";

export type { MemoryWriteNodeData } from "./memory-write-node";
export {
  createMemoryWriteNodeData,
  MemoryWriteNode,
} from "./memory-write-node";

export const memoryNodeTypes = {
  memory_read: MemoryReadNode,
  memory_write: MemoryWriteNode,
  memory_search: MemorySearchNode,
} as const;
