import { CodeNode } from "./code-node";
import { TemplateNode } from "./template-node";

export type { CodeNodeConfig, CodeNodeData } from "./code-node";
export { CodeNode, createCodeNodeData } from "./code-node";
export type { TemplateNodeConfig, TemplateNodeData } from "./template-node";
export { createTemplateNodeData, TemplateNode } from "./template-node";

export const transformNodeTypes = {
  code: CodeNode,
  template: TemplateNode,
} as const;
