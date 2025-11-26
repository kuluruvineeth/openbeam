"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";

export default function SSOCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const provider = params.provider as string;
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      if (errorParam) {
        setStatus("error");
        setErrorMessage(errorParam);
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received");
        return;
      }

      try {
        // TODO: Exchange code for token via tRPC
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setStatus("success");
        // Redirect to app after successful auth
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch {
        setStatus("error");
        setErrorMessage("Failed to complete authentication");
      }
    }

    handleCallback();
  }, [code, errorParam, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <Icons.Spinner className="animate-spin text-primary" size={48} />
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">
              Completing sign in...
            </h1>
            <p className="text-muted-foreground">
              Verifying your {provider} credentials
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-green-500/10">
              <Icons.CheckIcon className="text-green-500" size={32} />
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">Success!</h1>
            <p className="text-muted-foreground">
              Redirecting you to the app...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-red-500/10">
              <Icons.XIcon className="text-red-500" size={32} />
            </div>
            <h1 className="mb-2 font-f37-stout text-xl">
              Authentication Failed
            </h1>
            <p className="mb-6 text-muted-foreground">
              {errorMessage || "Something went wrong during sign in"}
            </p>
            <a className="text-primary hover:underline" href="/login">
              Return to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
