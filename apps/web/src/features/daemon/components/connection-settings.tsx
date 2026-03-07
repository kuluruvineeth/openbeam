"use client";

import { Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { Input } from "@openbeam/ui/components/input";
import { cva } from "class-variance-authority";
import { useCallback, useState } from "react";
import { DAEMON_DEFAULT_PORT } from "../constants";
import {
  type ConnectionListEntry,
  type DaemonConnectionStatus,
  useDaemonConnections,
} from "../hooks/use-daemon-connection";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

const connectionCardVariants = cva(
  "flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors",
  {
    variants: {
      status: {
        online: "border-border/40",
        connecting: "border-border/40",
        offline: "border-border/30 opacity-60",
        error: "border-destructive/30",
      },
    },
    defaultVariants: {
      status: "offline",
    },
  }
);

function StatusBadge({ status }: { status: DaemonConnectionStatus }) {
  return <ConnectionStatusIndicator connected={status === "online"} />;
}

function ConnectionCard({
  connection,
  onRemove,
}: {
  connection: ConnectionListEntry;
  onRemove?: (serverId: string) => void;
}) {
  return (
    <div className={connectionCardVariants({ status: connection.status })}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm">
            {connection.label ?? connection.serverId}
          </span>
          {connection.version && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
              v{connection.version}
            </span>
          )}
        </div>
        <StatusBadge status={connection.status} />
      </div>
      {onRemove && (
        <Button
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(connection.serverId)}
          size="icon"
          variant="ghost"
        >
          <Icons.Trash className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

function AddConnectionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (endpoint: string, label: string) => void;
  onCancel: () => void;
}) {
  const [endpoint, setEndpoint] = useState(`localhost:${DAEMON_DEFAULT_PORT}`);
  const [label, setLabel] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = endpoint.trim();
    if (!trimmed) {
      return;
    }
    onAdd(trimmed, label.trim() || trimmed);
    setEndpoint(`localhost:${DAEMON_DEFAULT_PORT}`);
    setLabel("");
  }, [endpoint, label, onAdd]);

  return (
    <div className="space-y-2 rounded-md border border-border/40 p-3">
      <Input
        className="h-8 text-sm"
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        value={label}
      />
      <Input
        className="h-8 font-mono text-sm"
        onChange={(e) => setEndpoint(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        placeholder="host:port"
        value={endpoint}
      />
      <div className="flex justify-end gap-2">
        <Button
          className="h-7 text-xs"
          onClick={onCancel}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="h-7 text-xs"
          disabled={!endpoint.trim()}
          onClick={handleSubmit}
          size="sm"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

interface ConnectionSettingsProps {
  onAddConnection?: (endpoint: string, label: string) => void;
  onRemoveConnection?: (serverId: string) => void;
}

export function ConnectionSettings({
  onAddConnection,
  onRemoveConnection,
}: ConnectionSettingsProps) {
  const { connections } = useDaemonConnections();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = useCallback(
    (endpoint: string, label: string) => {
      onAddConnection?.(endpoint, label);
      setShowAddForm(false);
    },
    [onAddConnection]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Daemon Connections
        </h3>
        {onAddConnection && !showAddForm && (
          <Button
            className="size-6"
            onClick={() => setShowAddForm(true)}
            size="icon"
            variant="ghost"
          >
            <Icons.Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {connections.map((c) => (
          <ConnectionCard
            connection={c}
            key={c.serverId}
            onRemove={onRemoveConnection}
          />
        ))}
        {connections.length === 0 && !showAddForm && (
          <p className="py-3 text-center text-muted-foreground text-sm">
            No daemon connections configured
          </p>
        )}
      </div>

      {showAddForm && (
        <AddConnectionForm
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
