"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { EmptyState } from "../shared/empty-state";

type AgentCost = {
  agentId: string;
  agentName: string;
  totalCents: number;
  runCount: number;
  avgCostPerRunCents: number;
};

type CostByAgentProps = {
  agents: AgentCost[];
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CostByAgent({ agents }: CostByAgentProps) {
  if (agents.length === 0) {
    return (
      <EmptyState
        description="No agent cost data available yet"
        title="No cost data"
      />
    );
  }

  return (
    <div>
      <h2 className="mb-3 font-medium text-sm">Cost by Agent</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Agent</TableHead>
            <TableHead className="text-right text-xs">Runs</TableHead>
            <TableHead className="text-right text-xs">Avg / Run</TableHead>
            <TableHead className="text-right text-xs">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.agentId}>
              <TableCell className="font-medium text-sm">
                {agent.agentName}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {agent.runCount}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatCents(agent.avgCostPerRunCents)}
              </TableCell>
              <TableCell className="text-right font-medium text-sm tabular-nums">
                {formatCents(agent.totalCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
