"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "../shared/empty-state";

type CostEvent = {
  id: string;
  agentId?: string | null;
  agentName?: string | null;
  description?: string | null;
  costCents: number;
  createdAt: Date | string;
};

type CostByProjectProps = {
  events: CostEvent[];
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CostByProject({ events }: CostByProjectProps) {
  if (events.length === 0) {
    return (
      <EmptyState description="No cost events recorded yet" title="No events" />
    );
  }

  return (
    <div>
      <h2 className="mb-3 font-medium text-sm">Recent Cost Events</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="text-xs">Agent</TableHead>
            <TableHead className="text-right text-xs">Cost</TableHead>
            <TableHead className="text-right text-xs">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="max-w-[200px] truncate text-sm">
                {event.description ?? "Cost event"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {event.agentName ?? "-"}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatCents(event.costCents)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(event.createdAt), {
                  addSuffix: true,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
