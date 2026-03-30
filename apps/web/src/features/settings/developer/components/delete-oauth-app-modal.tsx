"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { useOAuthAppModal } from "../hooks/use-oauth-app-modal";

const CONFIRMATION_TEXT = "DELETE";

export function DeleteOAuthAppModal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { deleteAppId, close } = useOAuthAppModal();
  const [confirmation, setConfirmation] = useState("");

  const deleteMutation = useMutation({
    ...trpc.oauthApplications.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.oauthApplications.list.queryOptions().queryKey,
      });
      close();
      setConfirmation("");
      toast.success("OAuth application deleted");
    },
    onError: () => {
      toast.error("Failed to delete OAuth application");
    },
  });

  const isMatch = confirmation === CONFIRMATION_TEXT;

  return (
    <Dialog
      onOpenChange={() => {
        close();
        setConfirmation("");
      }}
      open={Boolean(deleteAppId)}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Delete OAuth Application</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ul className="space-y-1.5 text-muted-foreground text-xs">
            <li className="flex items-start gap-2">
              <Icons.AlertTriangle
                className="mt-0.5 shrink-0 text-destructive"
                size={12}
              />
              All access tokens will be immediately revoked
            </li>
            <li className="flex items-start gap-2">
              <Icons.AlertTriangle
                className="mt-0.5 shrink-0 text-destructive"
                size={12}
              />
              Applications using this client will stop working
            </li>
            <li className="flex items-start gap-2">
              <Icons.AlertTriangle
                className="mt-0.5 shrink-0 text-destructive"
                size={12}
              />
              This cannot be undone
            </li>
          </ul>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirmation">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">
                {CONFIRMATION_TEXT}
              </span>{" "}
              to confirm
            </Label>
            <Input
              autoComplete="off"
              id="delete-confirmation"
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              value={confirmation}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              close();
              setConfirmation("");
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={!isMatch || deleteMutation.isPending}
            onClick={() => {
              if (deleteAppId) {
                deleteMutation.mutate({ id: deleteAppId });
              }
            }}
            variant="destructive"
          >
            {deleteMutation.isPending && (
              <Icons.Loader2 className="mr-1.5 animate-spin" size={14} />
            )}
            Delete Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
