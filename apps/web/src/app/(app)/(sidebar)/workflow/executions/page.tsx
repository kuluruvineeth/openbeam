import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Workflow Executions | OpenPlane",
  description: "View and manage workflow executions",
};

export default function WorkflowExecutionsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Workflow Executions</h1>
          <p className="text-muted-foreground">
            Your workflow executions will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
