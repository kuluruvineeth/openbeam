"use client";

import { Suspense } from "react";
import { OAuthAuthorizeContent } from "@/features/oauth/components/oauth-authorize-content";

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<OAuthLoadingSkeleton />}>
      <OAuthAuthorizeContent />
    </Suspense>
  );
}

function OAuthLoadingSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 rounded-sm border border-border/50 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 animate-pulse rounded-sm bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded-sm bg-muted" />
        </div>
        <div className="h-px bg-border/50" />
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
        </div>
        <div className="h-px bg-border/50" />
        <div className="flex gap-3">
          <div className="h-9 flex-1 animate-pulse rounded-sm bg-muted" />
          <div className="h-9 flex-1 animate-pulse rounded-sm bg-muted" />
        </div>
      </div>
    </main>
  );
}
