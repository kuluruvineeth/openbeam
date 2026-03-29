"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useApiKeyModal } from "../hooks/use-api-key-modal";

export function RevokeApiKeyModal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { type, data, close } = useApiKeyModal();

  const revokeMutation = useMutation({
    ...trpc.apiKeys.revoke.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apiKeys.list.queryOptions().queryKey,
      });
      close();
      toast.success("API key revoked");
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  const isOpen = type === "revoke";

  return (
    <Dialog onOpenChange={() => close()} open={isOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            This will permanently revoke{" "}
            <span className="font-semibold text-foreground">{data?.name}</span>{" "}
            and all access will stop immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => close()} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={revokeMutation.isPending}
            onClick={() => {
              if (data?.id) {
                revokeMutation.mutate({ id: data.id });
              }
            }}
            variant="destructive"
          >
            {revokeMutation.isPending ? "Revoking..." : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
