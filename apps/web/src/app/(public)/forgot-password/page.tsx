"use client";

import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    // TODO: Implement via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link className="mb-8 flex items-center justify-center gap-2" href="/">
          <Icons.Logo size={32} />
          <span className="font-f37-stout text-xl">OpenPlane</span>
        </Link>

        {isSubmitted ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-green-500/10">
              <Icons.CheckIcon className="text-green-500" size={32} />
            </div>
            <h1 className="mb-2 font-f37-stout text-2xl">Check your email</h1>
            <p className="mb-6 text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-muted-foreground text-sm">
              Didn't receive the email?{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => setIsSubmitted(false)}
                type="button"
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="mb-2 font-f37-stout text-2xl">
                Reset your password
              </h1>
              <p className="text-muted-foreground">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Email Address
                </label>
                <Input
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  type="email"
                  value={email}
                />
              </div>

              <Button
                className="w-full"
                disabled={!email.trim() || isLoading}
                size="lg"
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Icons.Spinner className="mr-2 animate-spin" size={16} />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href="/login">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
