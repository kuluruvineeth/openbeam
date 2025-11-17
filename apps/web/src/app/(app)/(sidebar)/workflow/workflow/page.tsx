import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Workflow | OpenPlane",
  description: "Build and manage your workflows",
};

export default function WorkflowBuilderPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Workflow</h1>
          <p className="text-muted-foreground">
            Your workflows will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
