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
import { Icons } from "@/components/icons";
import { useOAuthAppModal } from "../hooks/use-oauth-app-modal";
import { CopyInput } from "./copy-input";

export function OAuthSecretModal() {
  const { secretModalData, close } = useOAuthAppModal();

  return (
    <Dialog onOpenChange={() => close()} open={Boolean(secretModalData)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>OAuth Application Created</DialogTitle>
          <DialogDescription>
            The client secret will only be shown once. Copy and store it
            securely.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Icons.AlertTriangle
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            size={14}
          />
          <p className="text-amber-600 text-xs dark:text-amber-400">
            This secret cannot be retrieved later. If lost, you will need to
            regenerate it.
          </p>
        </div>
        {secretModalData && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <p className="font-medium text-muted-foreground text-xs">
                Client ID
              </p>
              <CopyInput value={secretModalData.clientId} />
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-muted-foreground text-xs">
                Client Secret
              </p>
              <CopyInput value={secretModalData.clientSecret} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => close()}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
