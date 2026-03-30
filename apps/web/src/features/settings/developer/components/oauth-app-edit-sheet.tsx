"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@openbeam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { useOAuthAppModal } from "../hooks/use-oauth-app-modal";
import type { OAuthAppFormValues } from "./oauth-app-form";
import { OAuthAppForm } from "./oauth-app-form";
import { OAuthAppStatusBadge } from "./oauth-app-status-badge";

export function OAuthAppEditSheet() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { sheetType, editAppId, close, openDelete, showSecret } =
    useOAuthAppModal();
  const isOpen = sheetType === "edit" && Boolean(editAppId);

  const { data: app, isLoading } = useQuery({
    ...trpc.oauthApplications.get.queryOptions({ id: editAppId ?? "" }),
    enabled: isOpen && Boolean(editAppId),
  });

  const updateMutation = useMutation({
    ...trpc.oauthApplications.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.oauthApplications.list.queryOptions().queryKey,
      });
      if (editAppId) {
        queryClient.invalidateQueries({
          queryKey: trpc.oauthApplications.get.queryOptions({ id: editAppId })
            .queryKey,
        });
      }
      close();
      toast.success("OAuth application updated");
    },
    onError: () => {
      toast.error("Failed to update OAuth application");
    },
  });

  const statusMutation = useMutation({
    ...trpc.oauthApplications.updateApprovalStatus.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.oauthApplications.list.queryOptions().queryKey,
      });
      if (editAppId) {
        queryClient.invalidateQueries({
          queryKey: trpc.oauthApplications.get.queryOptions({ id: editAppId })
            .queryKey,
        });
      }
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const regenerateMutation = useMutation({
    ...trpc.oauthApplications.regenerateSecret.mutationOptions(),
    onSuccess: (result) => {
      if (app) {
        showSecret(app.clientId, result.clientSecret);
      }
    },
    onError: () => {
      toast.error("Failed to regenerate secret");
    },
  });

  const handleSubmit = (values: OAuthAppFormValues) => {
    if (!editAppId) {
      return;
    }
    updateMutation.mutate({ id: editAppId, ...values });
  };

  const handleCopyClientId = () => {
    if (app?.clientId) {
      navigator.clipboard.writeText(app.clientId);
      toast.success("Client ID copied");
    }
  };

  const isPending = app?.status === "pending";
  const isDraft = app?.status === "draft" || app?.status === "rejected";

  return (
    <Sheet onOpenChange={() => close()} open={isOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-[480px]" side="right">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="flex-1 truncate">
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                (app?.name ?? "Application")
              )}
            </SheetTitle>
            {app && <OAuthAppStatusBadge status={app.status} />}
          </div>
        </SheetHeader>
        {app && (
          <div className="flex items-center gap-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Icons.MoreHorizontal size={14} />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleCopyClientId}>
                  <Icons.Copy size={14} />
                  Copy Client ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => regenerateMutation.mutate({ id: app.id })}
                >
                  <Icons.LockIcon size={14} />
                  Regenerate Secret
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isDraft && (
                  <DropdownMenuItem
                    onClick={() =>
                      statusMutation.mutate({ id: app.id, status: "pending" })
                    }
                  >
                    <Icons.CheckCircle2 size={14} />
                    Submit for Review
                  </DropdownMenuItem>
                )}
                {isPending && (
                  <DropdownMenuItem
                    onClick={() =>
                      statusMutation.mutate({ id: app.id, status: "draft" })
                    }
                  >
                    <Icons.Close size={14} />
                    Cancel Review
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDelete(app.id)}
                >
                  <Icons.Trash size={14} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className="pt-4">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div className="space-y-1.5" key={i}>
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          )}
          {app && (
            <OAuthAppForm
              defaultValues={{
                id: app.id,
                name: app.name,
                description: app.description ?? undefined,
                developerName: app.developerName ?? undefined,
                website: app.website ?? undefined,
                installUrl: app.installUrl ?? undefined,
                redirectUris: app.redirectUris,
                scopes: app.scopes,
                active: app.active,
              }}
              isSubmitting={updateMutation.isPending}
              onSubmit={handleSubmit}
              submitLabel="Update"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
