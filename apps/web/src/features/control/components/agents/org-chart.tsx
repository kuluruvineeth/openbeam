"use client";

import { cn } from "@/lib/utils";
import { useOrgChart } from "../../hooks/use-control-agents";
import { AgentIdentity } from "../shared/agent-avatar";

type OrgNode = {
  id: string;
  name: string;
  title?: string | null;
  status: string;
  children: OrgNode[];
};

export function OrgChart() {
  const { data: orgData, isLoading } = useOrgChart();

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-xs">Loading org chart...</p>
    );
  }

  if (!(orgData && Array.isArray(orgData)) || orgData.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No agents to display</p>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Organization</h3>
      <div className="space-y-1">
        {(orgData as OrgNode[]).map((node) => (
          <TreeNode depth={0} key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center rounded-sm px-2 py-1.5 transition-colors hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <AgentIdentity
          name={node.name}
          size="sm"
          // biome-ignore lint/suspicious/noExplicitAny: org chart status type is dynamic
          status={node.status as any}
          title={node.title}
        />
      </div>
      {node.children?.map((child) => (
        <TreeNode depth={depth + 1} key={child.id} node={child} />
      ))}
    </div>
  );
}
