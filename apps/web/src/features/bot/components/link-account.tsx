"use client";

import { Button, Skeleton } from "@openbeam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

const PLATFORM_LABELS: Record<string, string> = {
  SLACK: "Slack",
  TEAMS: "Microsoft Teams",
  DISCORD: "Discord",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
};

function LinkSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Skeleton className="h-10 w-10 rounded-sm" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-4 h-9 w-32" />
    </div>
  );
}

export function LinkAccount({ token }: { token: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [linked, setLinked] = useState(false);

  const { data, isLoading, error } = useQuery(
    trpc.bot.verifyLinkToken.queryOptions({ token })
  );

  const linkMutation = useMutation(
    trpc.bot.linkAccount.mutationOptions({
      onSuccess: () => {
        setLinked(true);
        toast.success("Account linked");
        queryClient.invalidateQueries();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  if (isLoading) {
    return <LinkSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-destructive text-sm">{error.message}</p>
        <Button onClick={() => router.push("/")} size="sm" variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (linked) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
          <span className="text-lg text-primary">&#10003;</span>
        </div>
        <p className="font-medium text-sm">
          {PLATFORM_LABELS[data?.platform ?? ""] ?? data?.platform} account
          linked
        </p>
        <p className="text-muted-foreground text-xs">
          You can close this window and return to your chat.
        </p>
      </div>
    );
  }

  const platformName =
    PLATFORM_LABELS[data?.platform ?? ""] ?? data?.platform ?? "Platform";

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="font-medium text-sm">
        Link your {platformName} account to OpenBeam
      </p>
      <p className="text-muted-foreground text-xs">
        This connects your {platformName} identity so the bot can search and
        answer on your behalf.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => router.push("/")} size="sm" variant="outline">
          Cancel
        </Button>
        <Button
          disabled={linkMutation.isPending}
          onClick={() => linkMutation.mutate({ token })}
          size="sm"
        >
          {linkMutation.isPending ? "Linking..." : "Link Account"}
        </Button>
      </div>
    </div>
  );
}
