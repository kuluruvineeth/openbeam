"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { format } from "date-fns";
import { useState } from "react";
import { Icons } from "@/components/icons";
import {
  useControlSecrets,
  useCreateSecret,
  useRotateSecret,
} from "../../hooks/use-control-settings";
import { EmptyState } from "../shared/empty-state";

function _maskValue(value: string): string {
  if (value.length <= 4) {
    return value;
  }
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

export function SecretsTab() {
  const { data: secrets } = useControlSecrets();
  const createMutation = useCreateSecret();
  const rotateMutation = useRotateSecret();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [provider, setProvider] = useState("");

  const [rotateId, setRotateId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  function handleCreate() {
    if (!(name && value)) {
      return;
    }
    createMutation.mutate(
      {
        name,
        value,
        provider: (provider || undefined) as
          | "LOCAL_ENCRYPTED"
          | "AWS_SECRETS_MANAGER"
          | "GCP_SECRET_MANAGER"
          | "VAULT"
          | undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setName("");
          setValue("");
          setProvider("");
        },
      }
    );
  }

  function handleRotate() {
    if (!(rotateId && rotateValue)) {
      return;
    }
    rotateMutation.mutate(
      { secretId: rotateId, value: rotateValue },
      {
        onSuccess: () => {
          setRotateId(null);
          setRotateValue("");
        },
      }
    );
  }

  if (!secrets?.length) {
    return (
      <EmptyState
        action={{
          label: "Add Secret",
          onClick: () => setCreateOpen(true),
        }}
        description="No secrets configured yet."
        icon={<Icons.LockIcon size={24} />}
        title="No secrets"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{secrets.length} secrets</p>
        <Dialog onOpenChange={setCreateOpen} open={createOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icons.Plus size={14} />
              Add Secret
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Secret</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="API_KEY"
                  value={name}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="sk-..."
                  type="password"
                  value={value}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Provider (optional)</Label>
                <Input
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="openai"
                  value={provider}
                />
              </div>
              <Button
                className="w-full"
                disabled={!(name && value) || createMutation.isPending}
                onClick={handleCreate}
                size="sm"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {secrets.map((secret) => (
            <TableRow key={secret.id}>
              <TableCell className="font-mono text-xs">{secret.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {secret.provider ?? "-"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {format(new Date(secret.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Dialog
                  onOpenChange={(open) => {
                    if (!open) {
                      setRotateId(null);
                      setRotateValue("");
                    }
                  }}
                  open={rotateId === secret.id}
                >
                  <Button
                    onClick={() => setRotateId(secret.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Icons.RefreshCw size={13} />
                    Rotate
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rotate {secret.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs">New Value</Label>
                        <Input
                          onChange={(e) => setRotateValue(e.target.value)}
                          placeholder="New secret value"
                          type="password"
                          value={rotateValue}
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={!rotateValue || rotateMutation.isPending}
                        onClick={handleRotate}
                        size="sm"
                      >
                        {rotateMutation.isPending
                          ? "Rotating..."
                          : "Rotate Secret"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
