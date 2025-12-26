"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "@/lib/auth/client";

export function GoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    signIn("google");
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
