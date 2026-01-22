"use client";

import { useParams } from "next/navigation";

export default function ExecutionPage() {
  const params = useParams<{ id: string; executionId: string }>();

  return (
    <div className="p-6">
      <h1 className="font-semibold text-2xl">Execution Details</h1>
      <p className="mt-2 text-muted-foreground">
        Agent: {params.id} | Execution: {params.executionId}
      </p>
      <div className="mt-6 rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">
          Execution details view coming soon.
        </p>
      </div>
    </div>
  );
}
