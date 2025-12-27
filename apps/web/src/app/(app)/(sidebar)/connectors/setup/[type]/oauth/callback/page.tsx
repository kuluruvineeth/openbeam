"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OAuthLoading } from "@/components/integrations/oauth-loading";
import { Button } from "@/components/ui/button";
import { handleOAuthAuthorizationResponse } from "@/lib/oauth-utils";
import { useTRPC } from "@/trpc/client";

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const processedRef = useRef(false);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const connectorType = params.type as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    if (processedRef.current) {
      return;
    }

    if (!(code && state)) {
      if (!error) {
        router.replace("/connectors");
      }
      return;
    }

    processedRef.current = true;

    if (error) {
      setStatus("error");
      setMessage(error);
      toast.error("Connection Failed", { description: error });
      return;
    }

    const processCallback = async () => {
      const result = await handleOAuthAuthorizationResponse(
        connectorType,
        code,
        state
      );

      if (!result.success) {
        throw new Error(result.message || "Unknown error");
      }

      setStatus("success");
      setMessage("Connected successfully!");
      toast.success("Connected Successfully");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.apps.list.queryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.includes("getSyncStatus"),
        }),
      ]);

      setTimeout(() => {
        router.refresh();
        router.replace("/connectors");
      }, 1500);
    };

    processCallback().catch((e) => {
      // TODO: Replace with structured logging service
      console.error(e);
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Unknown error");
      toast.error("Connection Failed");
    });
  }, [code, state, error, connectorType, router, queryClient, trpc]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OAuthLoading
          integration={connectorType}
          message={message}
          state={status === "loading" ? "processing" : status}
        />
        {status === "error" && (
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline">
              <Link href="/connectors">Back to Connectors</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
