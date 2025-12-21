import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export const remarkMermaid: Plugin<[], Root> = () => (tree) => {
  visit(tree, "code", (node, index, parent) => {
    if (node.lang !== "mermaid" || index === undefined || !parent) {
      return;
    }

    parent.children.splice(index, 1, {
      type: "mdxJsxFlowElement",
      name: "Mermaid",
      attributes: [
        {
          type: "mdxJsxAttribute",
          name: "chart",
          value: node.value,
        },
      ],
      children: [],
      data: { _mdxExplicitJsx: true },
    } as never);
  });
};
