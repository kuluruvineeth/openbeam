"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

type CallbackState = "processing" | "success" | "error";

/**
 * OAuth Callback Page
 *
 * This page handles the OAuth redirect from the Hono server.
 * The actual token exchange happens on the server side at:
 * GET /api/v1/connectors/oauth/{provider}/callback
 *
 * This frontend page just displays the result to the user.
 */
export default function OAuthCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const provider = params.provider as string;

  // Check for success/error from URL params (set by server redirect)
  const success = searchParams.get("success");
  const connectorId = searchParams.get("connectorId");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // If we have OAuth params (code/state), we're being redirected from provider
  // This means the server callback hasn't processed yet - redirect to server
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const [callbackState, setCallbackState] = useState<CallbackState>(
    success === "true"
      ? "success"
      : error || oauthError
        ? "error"
        : "processing"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorDescription || error || oauthError || null
  );

  useEffect(() => {
    // If we have a code, the provider redirected here but we need to go to the server
    // The server should be the OAuth redirect URI, not this page
    // This handles the case where someone manually configured the wrong redirect URI
    if (code && !success && !error) {
      // Redirect to server callback to exchange code
      const serverUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const callbackUrl = new URL(
        `/api/v1/connectors/oauth/${provider}/callback`,
        serverUrl
      );
      callbackUrl.searchParams.set("code", code);
      if (state) callbackUrl.searchParams.set("state", state);

      window.location.href = callbackUrl.toString();
      return;
    }

    // If we already have success/error, update state
    if (success === "true") {
      setCallbackState("success");
    } else if (error || oauthError) {
      setCallbackState("error");
      setErrorMessage(errorDescription || error || oauthError);
    }
  }, [code, state, success, error, oauthError, errorDescription, provider]);

  const handleContinue = () => {
    if (connectorId) {
      window.location.href = `/connectors/${connectorId}`;
    } else {
      window.location.href = "/connectors";
    }
  };

  const handleRetry = () => {
    window.location.href = "/connectors/add";
  };

  const handleBack = () => {
    window.location.href = "/connectors";
  };

  // Format provider name for display
  const providerName = provider
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
      <div className="w-full max-w-md text-center">
        {/* Processing State */}
        {callbackState === "processing" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center bg-primary/10">
                <Icons.RefreshCw
                  className="animate-spin text-primary"
                  size={32}
                />
              </div>
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">
              Connecting to {providerName}
            </h1>
            <p className="text-muted-foreground">
              Please wait while we complete the authorization...
            </p>
          </>
        )}

        {/* Success State */}
        {callbackState === "success" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center bg-green-500/10">
                <Icons.CheckIcon className="text-green-500" size={32} />
              </div>
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">
              {providerName} Connected!
            </h1>
            <p className="mb-6 text-muted-foreground">
              Your {providerName} account has been successfully connected.
              We&apos;ll start syncing your data shortly.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleContinue}>View Connector</Button>
              <Button onClick={handleBack} variant="outline">
                All Connectors
              </Button>
            </div>
          </>
        )}

        {/* Error State */}
        {callbackState === "error" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center bg-red-500/10">
                <Icons.AlertCircle className="text-red-500" size={32} />
              </div>
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">Connection Failed</h1>
            <p className="mb-2 text-muted-foreground">
              We couldn&apos;t connect to {providerName}.
            </p>
            {errorMessage && (
              <p className="mb-6 text-red-500 text-sm">{errorMessage}</p>
            )}
            <div className="flex justify-center gap-3">
              <Button onClick={handleRetry}>Try Again</Button>
              <Button onClick={handleBack} variant="outline">
                Back to Connectors
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
