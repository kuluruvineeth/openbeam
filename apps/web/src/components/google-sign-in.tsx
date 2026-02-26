"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";

export function GoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    signIn("google");
  };

  return (
    <button
      className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      disabled={isLoading}
      onClick={handleSignIn}
      type="button"
    >
      <div className="flex items-center space-x-2">
        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
          <path
            d="M21.805 10.023H12v3.955h5.613c-.241 1.273-.966 2.351-2.052 3.075v2.553h3.319c1.943-1.791 3.12-4.429 3.12-7.557 0-.701-.063-1.373-.195-2.026Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.817 0 5.182-.926 6.908-2.51l-3.32-2.554c-.924.622-2.103.99-3.588.99-2.756 0-5.091-1.859-5.923-4.358H2.648v2.635A10 10 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.077 13.568A5.99 5.99 0 0 1 5.746 11c0-.892.156-1.757.431-2.568V5.797H2.648A10 10 0 0 0 2 11c0 1.611.386 3.136 1.07 4.365l3.007-1.797Z"
            fill="#FBBC05"
          />
          <path
            d="M12 4.073c1.534 0 2.908.529 3.987 1.565l2.986-2.985C17.18.981 14.816 0 12 0A10 10 0 0 0 3.07 5.797l3.107 2.635C6.909 5.933 9.244 4.073 12 4.073Z"
            fill="#EA4335"
          />
        </svg>
        <span>{isLoading ? "Redirecting..." : "Continue with Google"}</span>
      </div>
    </button>
  );
}
