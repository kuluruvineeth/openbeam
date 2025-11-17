import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Members | OpenPlane",
  description: "Manage your team members",
};

export default function MembersPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Members</h1>
          <p className="text-muted-foreground">
            Your team members will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
