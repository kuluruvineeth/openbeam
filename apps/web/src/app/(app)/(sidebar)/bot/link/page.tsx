"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LinkAccount } from "@/features/bot";

function LinkContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Invalid link — no token provided.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-md border border-border/50 bg-card p-6">
        <LinkAccount token={token} />
      </div>
    </div>
  );
}

export default function BotLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      }
    >
      <LinkContent />
    </Suspense>
  );
}
