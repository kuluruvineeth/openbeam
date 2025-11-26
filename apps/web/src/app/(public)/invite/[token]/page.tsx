"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const token = params.token as string;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch invite details
  const {
    data: invite,
    isLoading,
    error,
  } = useQuery(trpc.enterprise.getInvite.queryOptions({ token }));

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && password.trim())) return;

    setIsAccepting(true);
    // TODO: Implement via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("Welcome to the team!");
    router.push("/");
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-red-500/10">
            <Icons.XIcon className="text-red-500" size={32} />
          </div>
          <h1 className="mb-2 font-f37-stout text-2xl">Invalid Invitation</h1>
          <p className="mb-6 text-muted-foreground">
            This invitation link is invalid or has expired.
          </p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link className="mb-8 flex items-center justify-center gap-2" href="/">
          <Icons.Logo size={32} />
          <span className="font-f37-stout text-xl">OpenPlane</span>
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="mb-2 font-f37-stout text-2xl">
                You've been invited
              </h1>
              <p className="text-muted-foreground">
                Join <strong>{invite?.teamName || "the team"}</strong> on
                OpenPlane
              </p>
            </div>

            <form onSubmit={handleAccept}>
              <div className="mb-4">
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Your Name
                </label>
                <Input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  value={name}
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Email
                </label>
                <Input
                  disabled
                  placeholder="you@company.com"
                  value={invite?.email || ""}
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Create Password
                </label>
                <Input
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
              </div>

              <Button
                className="w-full"
                disabled={!(name.trim() && password.trim()) || isAccepting}
                size="lg"
                type="submit"
              >
                {isAccepting ? (
                  <>
                    <Icons.Spinner className="mr-2 animate-spin" size={16} />
                    Joining...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link className="text-primary hover:underline" href="/login">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
