"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Icons } from "@/components/icons";
import {
  useAgentApiKeys,
  useCreateAgentApiKey,
  useRevokeAgentApiKey,
} from "../../hooks/use-control-agents";
import { ConfirmDialog } from "../shared/confirm-dialog";

type AgentKeysTabProps = {
  agentId: string;
};

export function AgentKeysTab({ agentId }: AgentKeysTabProps) {
  const { data: keys, isLoading } = useAgentApiKeys(agentId);
  const createMutation = useCreateAgentApiKey();
  const revokeMutation = useRevokeAgentApiKey();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  function handleCreate() {
    createMutation.mutate(
      { agentId, name: keyName || "default" },
      {
        onSuccess: (data) => {
          setNewToken(data.token);
          setKeyName("");
          setCreateOpen(false);
        },
      }
    );
  }

  function handleRevoke() {
    if (!revokeKeyId) {
      return;
    }
    revokeMutation.mutate(
      { keyId: revokeKeyId },
      { onSuccess: () => setRevokeKeyId(null) }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">API Keys</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm" variant="outline">
          <Icons.Plus size={14} />
          Create Key
        </Button>
      </div>

      {newToken && (
        <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="mb-1 font-medium text-xs">
            Copy this token now. It will not be shown again.
          </p>
          <code className="block break-all text-xs">{newToken}</code>
          <Button
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(newToken);
            }}
            size="sm"
            variant="ghost"
          >
            <Icons.Copy size={12} />
            Copy
          </Button>
        </div>
      )}

      {isLoading && <p className="text-muted-foreground text-xs">Loading...</p>}
      {!isLoading && (!keys || keys.length === 0) && (
        <p className="text-muted-foreground text-xs">No API keys</p>
      )}
      {!isLoading && keys && keys.length > 0 && (
        <div className="space-y-1.5">
          {keys.map((key) => (
            <div
              className="flex items-center justify-between rounded-sm border border-border/50 px-3 py-2"
              key={key.id}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{key.name}</p>
                <p className="text-muted-foreground text-xs">
                  Created{" "}
                  {formatDistanceToNow(new Date(key.createdAt), {
                    addSuffix: true,
                  })}
                  {key.lastUsedAt &&
                    ` · Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`}
                </p>
              </div>
              {key.revokedAt ? (
                <span className="text-muted-foreground text-xs">Revoked</span>
              ) : (
                <Button
                  onClick={() => setRevokeKeyId(key.id)}
                  size="sm"
                  variant="ghost"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. production)"
            value={keyName}
          />
          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={handleCreate}
              size="sm"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Revoke"
        description="This key will immediately stop working. This cannot be undone."
        destructive
        onConfirm={handleRevoke}
        onOpenChange={() => setRevokeKeyId(null)}
        open={revokeKeyId !== null}
        pending={revokeMutation.isPending}
        title="Revoke API Key?"
      />
    </div>
  );
}
