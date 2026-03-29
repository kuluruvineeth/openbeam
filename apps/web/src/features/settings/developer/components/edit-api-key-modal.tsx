"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useApiKeyModal } from "../hooks/use-api-key-modal";
import { ApiKeyForm } from "./api-key-form";

export function EditApiKeyModal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { type, data, close } = useApiKeyModal();

  const updateMutation = useMutation({
    ...trpc.apiKeys.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apiKeys.list.queryOptions().queryKey,
      });
      close();
      toast.success("API key updated");
    },
    onError: () => {
      toast.error("Failed to update API key");
    },
  });

  const isOpen = type === "edit";

  return (
    <Dialog onOpenChange={() => close()} open={isOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
        </DialogHeader>
        {data && (
          <ApiKeyForm
            defaultValues={{ name: data.name, scopes: data.scopes }}
            isSubmitting={updateMutation.isPending}
            onSubmit={(values) =>
              updateMutation.mutate({ id: data.id, ...values })
            }
            submitLabel="Update"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
