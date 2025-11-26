"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function OrgChartPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          onClick={() => router.push("/people")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Organization Chart</h1>
          <p className="text-muted-foreground text-sm">
            Visualize your organization's structure
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center border border-border border-dashed py-24 text-center">
        <Icons.Workflow className="mb-4 text-muted-foreground" size={48} />
        <h3 className="mb-2 font-medium text-foreground text-lg">
          Interactive Org Chart
        </h3>
        <p className="mb-6 max-w-md text-muted-foreground text-sm">
          An interactive organization chart will be displayed here, showing the
          hierarchical structure of your organization. You'll be able to explore
          teams, departments, and reporting relationships.
        </p>
        <Button onClick={() => router.push("/people")} variant="outline">
          Back to People
        </Button>
      </div>
    </div>
  );
}
