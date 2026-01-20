import { CodeNode } from "./code-node";
import { FilterNode } from "./filter-node";
import { TemplateNode } from "./template-node";

export type { CodeNodeConfig, CodeNodeData } from "./code-node";
export { CodeNode, createCodeNodeData } from "./code-node";
export type { FilterNodeConfig, FilterNodeData } from "./filter-node";
export { createFilterNodeData, FilterNode } from "./filter-node";
export type { TemplateNodeConfig, TemplateNodeData } from "./template-node";
export { createTemplateNodeData, TemplateNode } from "./template-node";

export const transformNodeTypes = {
  code: CodeNode,
  filter: FilterNode,
  template: TemplateNode,
} as const;
