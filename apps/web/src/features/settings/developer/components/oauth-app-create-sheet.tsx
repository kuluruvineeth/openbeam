"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useOAuthAppModal } from "../hooks/use-oauth-app-modal";
import type { OAuthAppFormValues } from "./oauth-app-form";
import { OAuthAppForm } from "./oauth-app-form";

export function OAuthAppCreateSheet() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { sheetType, showSecret, close } = useOAuthAppModal();

  const createMutation = useMutation({
    ...trpc.oauthApplications.create.mutationOptions(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: trpc.oauthApplications.list.queryOptions().queryKey,
      });
      showSecret(result.clientId, result.clientSecret);
      toast.success("OAuth application created");
    },
    onError: () => {
      toast.error("Failed to create OAuth application");
    },
  });

  const handleSubmit = (values: OAuthAppFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Sheet onOpenChange={() => close()} open={sheetType === "create"}>
      <SheetContent className="overflow-y-auto sm:max-w-[480px]" side="right">
        <SheetHeader>
          <SheetTitle>Create OAuth Application</SheetTitle>
          <SheetDescription>
            Register an application that authenticates via OAuth 2.0.
          </SheetDescription>
        </SheetHeader>
        <div className="pt-4">
          <OAuthAppForm
            isSubmitting={createMutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
