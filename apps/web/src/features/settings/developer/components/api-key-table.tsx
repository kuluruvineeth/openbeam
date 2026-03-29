"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { useApiKeyModal } from "../hooks/use-api-key-modal";
import { scopesToDisplayName } from "../lib/scopes";
import { API_KEY_COLUMNS, type ApiKeyRow } from "./api-key-columns";
import { ApiKeyEmptyState } from "./api-key-empty-state";

function RelativeDate({ date }: { date: Date | null }) {
  if (!date) {
    return <span className="text-muted-foreground">Never</span>;
  }
  return <>{formatDistanceToNow(date, { addSuffix: true })}</>;
}

function ActionsCell({ row }: { row: ApiKeyRow }) {
  const { open } = useApiKeyModal();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-8 p-0" size="sm" variant="ghost">
          <Icons.MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            open("edit", {
              id: row.id,
              name: row.name,
              scopes: row.scopes,
              prefix: row.prefix,
            })
          }
        >
          <Icons.Pencil size={14} />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            open("revoke", {
              id: row.id,
              name: row.name,
              scopes: row.scopes,
              prefix: row.prefix,
            })
          }
        >
          <Icons.Trash size={14} />
          Revoke
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ApiKeyTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.apiKeys.list.queryOptions());
  const { open } = useApiKeyModal();

  const activeKeys = (data ?? []).filter((k): k is ApiKeyRow => !k.revoked);

  if (activeKeys.length === 0) {
    return (
      <div>
        <Header onCreateClick={() => open("create")} />
        <ApiKeyEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Header onCreateClick={() => open("create")} />
      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              {API_KEY_COLUMNS.map((col) => (
                <TableHead className={col.className} key={col.id}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeKeys.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
                  {row.prefix}...
                </TableCell>
                <TableCell>
                  <Badge className="text-[11px]" variant="secondary">
                    {scopesToDisplayName(row.scopes)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  <RelativeDate date={row.createdAt} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  <RelativeDate date={row.lastUsedAt} />
                </TableCell>
                <TableCell>
                  <ActionsCell row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Header({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium text-lg">API Keys</h3>
        <p className="text-muted-foreground text-sm">
          Manage keys for MCP clients, CLI access, and third-party integrations.
        </p>
      </div>
      <Button onClick={onCreateClick} size="sm">
        <Icons.Plus size={14} />
        Create API Key
      </Button>
    </div>
  );
}
