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
import { ApiKeyForm } from "./api-key-form";
import { CopyInput } from "./copy-input";

export function CreateApiKeyModal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { type, createdKey, close, setCreatedKey } = useApiKeyModal();

  const createMutation = useMutation({
    ...trpc.apiKeys.create.mutationOptions(),
    onSuccess: (result) => {
      setCreatedKey(result.key);
      queryClient.invalidateQueries({
        queryKey: trpc.apiKeys.list.queryOptions().queryKey,
      });
    },
    onError: () => {
      toast.error("Failed to create API key");
    },
  });

  const isOpen = type === "create";

  if (isOpen && createdKey) {
    return (
      <Dialog onOpenChange={() => close()} open>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              This key will only be shown once. Copy it and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <CopyInput value={createdKey} />
          </div>
          <DialogFooter>
            <Button onClick={() => close()}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={() => close()} open={isOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>
        <ApiKeyForm
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </DialogContent>
    </Dialog>
  );
}
