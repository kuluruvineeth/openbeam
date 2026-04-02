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
import { useOAuthAppModal } from "../hooks/use-oauth-app-modal";
import { scopesToDisplayName } from "../lib/scopes";
import { resolveLogo } from "./mcp-client-logos";
import { OAuthAppStatusBadge } from "./oauth-app-status-badge";

type OAuthAppRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  clientId: string;
  scopes: string[];
  isPublic: boolean;
  active: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function OAuthAppLogo({ name }: { name: string }) {
  const Logo = resolveLogo(name);
  if (Logo) {
    return Logo({ size: 28 });
  }

  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border/50 bg-muted/50">
      <Icons.Globe className="text-muted-foreground" size={14} />
    </div>
  );
}

const COLUMNS: { id: string; header: string; className?: string }[] = [
  { id: "name", header: "Application" },
  { id: "clientId", header: "Client ID", className: "w-[200px]" },
  { id: "scopes", header: "Permissions", className: "w-[140px]" },
  { id: "status", header: "Status", className: "w-[130px]" },
  { id: "updatedAt", header: "Updated", className: "w-[140px]" },
  { id: "actions", header: "", className: "w-[48px]" },
];

function ActionsCell({ row }: { row: OAuthAppRow }) {
  const { openEdit, openDelete } = useOAuthAppModal();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-8 p-0" size="sm" variant="ghost">
          <Icons.MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openEdit(row.id)}>
          <Icons.Pencil size={14} />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => openDelete(row.id)}
        >
          <Icons.Trash size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState() {
  const { openCreate } = useOAuthAppModal();

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex size-10 items-center justify-center rounded-md border border-border/50 bg-muted/50">
        <Icons.Globe className="text-muted-foreground" size={20} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="font-medium text-sm">No OAuth applications</p>
        <p className="max-w-[300px] text-center text-muted-foreground text-xs">
          Register an application to authenticate users via OAuth 2.0.
        </p>
      </div>
      <Button className="mt-1" onClick={openCreate} size="sm" variant="outline">
        <Icons.Plus size={14} />
        Create OAuth App
      </Button>
    </div>
  );
}

function Header({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium text-lg">OAuth Applications</h3>
        <p className="text-muted-foreground text-sm">
          Register applications that authenticate via OAuth 2.0.
        </p>
      </div>
      <Button onClick={onCreateClick} size="sm">
        <Icons.Plus size={14} />
        Create OAuth App
      </Button>
    </div>
  );
}

export function OAuthAppTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.oauthApplications.list.queryOptions());
  const { openCreate, openEdit } = useOAuthAppModal();

  const apps = (data ?? []) as OAuthAppRow[];

  if (apps.length === 0) {
    return (
      <div>
        <Header onCreateClick={openCreate} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Header onCreateClick={openCreate} />
      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead className={col.className} key={col.id}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((row) => (
              <TableRow
                className="cursor-pointer"
                key={row.id}
                onClick={() => openEdit(row.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <OAuthAppLogo name={row.name} />
                    <span className="truncate font-medium text-sm">
                      {row.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-muted-foreground text-xs">
                    {row.clientId.slice(0, 20)}...
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className="text-[11px]" variant="secondary">
                    {scopesToDisplayName(row.scopes)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <OAuthAppStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDistanceToNow(row.updatedAt, { addSuffix: true })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
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
