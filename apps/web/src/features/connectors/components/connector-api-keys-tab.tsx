"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Skeleton,
} from "@openbeam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

type ConnectorApiKeysTabProps = {
  connectorId: string;
};

function ApiKeysSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          className="flex items-center justify-between border border-border/50 p-3"
          key={`key-skeleton-${i}`}
        >
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function NewKeyDialog({
  connectorId,
  onKeyCreated,
}: {
  connectorId: string;
  onKeyCreated: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    ...trpc.customConnectors.generateApiKey.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trpc.customConnectors.listApiKeys.queryOptions({
          definitionId: connectorId,
        }).queryKey,
      });
      onKeyCreated(data.apiKey);
      setOpen(false);
      setName("");
      toast.success("API key generated");
    },
    onError: () => {
      toast.error("Failed to generate API key");
    },
  });

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    generateMutation.mutate({
      definitionId: connectorId,
      name: name.trim(),
    });
  }, [name, connectorId, generateMutation]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Icons.Plus className="mr-1.5" size={14} />
          Generate Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Generate API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            placeholder="Key name (e.g. Production, CI/CD)"
            value={name}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || generateMutation.isPending}
              onClick={handleSubmit}
              size="sm"
            >
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewKeyBanner({
  apiKey,
  onDismiss,
}: {
  apiKey: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-medium text-sm">Copy your API key now</p>
          <p className="text-foreground/50 text-xs">
            This is the only time the full key will be shown.
          </p>
        </div>
        <button
          className="text-foreground/40 transition-colors hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          <Icons.Close size={14} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-sm border border-border/50 bg-background px-3 py-1.5 font-mono text-xs">
          {apiKey}
        </code>
        <Button onClick={handleCopy} size="sm" variant="outline">
          {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}

function KeyRow({
  apiKey,
  connectorId,
}: {
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    lastUsedAt: Date | null;
    revoked: boolean;
    createdAt: Date;
  };
  connectorId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    ...trpc.customConnectors.revokeApiKey.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.customConnectors.listApiKeys.queryOptions({
          definitionId: connectorId,
        }).queryKey,
      });
      toast.success("API key revoked");
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  return (
    <div className="flex items-center justify-between border border-border/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{apiKey.name}</span>
          {apiKey.revoked && (
            <span className="rounded-sm bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
              Revoked
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-foreground/40 text-xs">
          <span className="font-mono">{apiKey.prefix}...</span>
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(apiKey.createdAt), {
              addSuffix: true,
            })}
          </span>
          {apiKey.lastUsedAt && (
            <span>
              Last used{" "}
              {formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>
      {!apiKey.revoked && (
        <Button
          disabled={revokeMutation.isPending}
          onClick={() =>
            revokeMutation.mutate({
              definitionId: connectorId,
              keyId: apiKey.id,
            })
          }
          size="sm"
          variant="ghost"
        >
          Revoke
        </Button>
      )}
    </div>
  );
}

export function ConnectorApiKeysTab({ connectorId }: ConnectorApiKeysTabProps) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const trpc = useTRPC();

  const { data: keys, isLoading } = useQuery(
    trpc.customConnectors.listApiKeys.queryOptions({
      definitionId: connectorId,
    })
  );

  if (isLoading) {
    return <ApiKeysSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">API Keys</h3>
          <p className="text-foreground/50 text-xs">
            Manage keys for pushing data to this connector.
          </p>
        </div>
        <NewKeyDialog connectorId={connectorId} onKeyCreated={setNewKey} />
      </div>

      {newKey && (
        <NewKeyBanner apiKey={newKey} onDismiss={() => setNewKey(null)} />
      )}

      <div className="space-y-2">
        {keys?.map((key) => (
          <KeyRow apiKey={key} connectorId={connectorId} key={key.id} />
        ))}
        {keys?.length === 0 && (
          <div className="flex h-32 items-center justify-center border border-border/50 border-dashed">
            <p className="text-foreground/40 text-sm">No API keys</p>
          </div>
        )}
      </div>
    </div>
  );
}
