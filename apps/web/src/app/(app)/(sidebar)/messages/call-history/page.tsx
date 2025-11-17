import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Call History | OpenPlane",
  description: "View your call history",
};

export default function CallHistoryPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Call History</h1>
          <p className="text-muted-foreground">
            Your call history will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
