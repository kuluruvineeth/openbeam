"use client";

import { useQueryClient } from "@tanstack/react-query";
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
  const integration = params.integration as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    if (processedRef.current) {
      return;
    }

    if (error) {
      processedRef.current = true;
      setStatus("error");
      setMessage(error);
      toast.error("Connection Failed", { description: error });
      return;
    }

    if (!(code && state && integration)) {
      // If missing params, check if we are just loading
      if (!(code || state)) {
        return;
      }

      processedRef.current = true;
      setStatus("error");
      setMessage("Missing parameters");
      return;
    }

    processedRef.current = true;

    const processCallback = async () => {
      try {
        const result = await handleOAuthAuthorizationResponse(
          integration,
          code,
          state
        );

        if (result.success) {
          setStatus("success");
          setMessage(`Successfully connected to ${integration}`);
          toast.success("Connected Successfully");

          queryClient.invalidateQueries({
            queryKey: trpc.apps.list.queryOptions().queryKey,
          });

          setTimeout(() => {
            if (result.redirect_on_success) {
              window.location.href = result.redirect_on_success;
            } else {
              router.push("/integrations");
            }
          }, 1500);
        } else {
          throw new Error(result.message || "Unknown error");
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
        const msg = e instanceof Error ? e.message : "Unknown error";
        setMessage(msg);
        toast.error("Connection Failed", { description: msg });
      }
    };

    processCallback();
  }, [code, state, error, integration, router, queryClient, trpc]);

  const getDisplayState = ():
    | "connecting"
    | "processing"
    | "success"
    | "error" => {
    if (status === "success") {
      return "success";
    }
    if (status === "error") {
      return "error";
    }
    return "processing";
  };

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OAuthLoading
          integration={integration}
          message={message}
          state={getDisplayState()}
        />
        {status === "error" && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => router.push("/integrations")}
              variant="outline"
            >
              Back to Integrations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
