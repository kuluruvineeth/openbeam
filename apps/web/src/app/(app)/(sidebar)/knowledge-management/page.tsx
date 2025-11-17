import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Knowledge Management | OpenPlane",
  description: "Manage your knowledge base",
};

export default function KnowledgeManagementPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Knowledge Management</h1>
          <p className="text-muted-foreground">
            Your knowledge base will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
