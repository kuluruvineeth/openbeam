"use client";

import type { ControlAgentStatus } from "@openbeam/types/control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { AgentIdentity } from "../shared/agent-avatar";
import { StatusBadge } from "../shared/status-badge";

type AgentListItem = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: ControlAgentStatus;
  adapterType: string;
  lastHeartbeatAt: Date | string | null;
};

type AgentsTableProps = {
  agents: AgentListItem[];
};

export function AgentsTable({ agents }: AgentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[280px]">Agent</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Adapter</TableHead>
          <TableHead className="text-right">Last Heartbeat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell>
              <Link
                className="block hover:underline"
                href={`/control/agents/${agent.id}`}
              >
                <AgentIdentity
                  name={agent.name}
                  size="sm"
                  status={agent.status}
                  title={agent.title}
                />
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs capitalize">
              {agent.role}
            </TableCell>
            <TableCell>
              <StatusBadge domain="agent" size="sm" status={agent.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {agent.adapterType}
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-xs">
              {agent.lastHeartbeatAt
                ? formatDistanceToNow(new Date(agent.lastHeartbeatAt), {
                    addSuffix: true,
                  })
                : "Never"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
