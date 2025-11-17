import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Made By Me | OpenPlane",
  description: "View agents created by you",
};

export default function MyAgentsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Made By Me</h1>
          <p className="text-muted-foreground">
            Agents created by you will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
