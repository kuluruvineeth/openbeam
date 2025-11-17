"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";
import { Icons } from "./icons";
import { SubmitButton } from "./submit-button";

export function GoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn.social(
      {
        provider: "google",
        callbackURL: process.env.CORS_ORIGIN,
      },
      { credentials: "include" }
    );
  };
  return (
    <SubmitButton isSubmitting={isLoading} onClick={handleSignIn}>
      <div className="flex items-center space-x-2">
        <Icons.Google />
        <span>Continue with Google</span>
      </div>
    </SubmitButton>
  );
}
