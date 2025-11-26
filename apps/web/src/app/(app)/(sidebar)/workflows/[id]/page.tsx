"use client";

import { useParams, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/workflows")}
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="font-f37-stout text-xl">Workflow Editor</h1>
            <p className="text-muted-foreground text-sm">
              Edit workflow configuration and steps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/workflows/${workflowId}/runs`)}
            variant="outline"
          >
            <Icons.History className="mr-2" size={16} />
            View Runs
          </Button>
          <Button>
            <Icons.CheckIcon className="mr-2" size={16} />
            Save
          </Button>
        </div>
      </div>

      {/* Editor Placeholder */}
      <div className="flex h-[calc(100vh-280px)] flex-col items-center justify-center border border-border border-dashed">
        <Icons.Workflow className="mb-4 text-muted-foreground" size={48} />
        <h3 className="mb-2 font-medium text-foreground text-lg">
          Visual Workflow Editor
        </h3>
        <p className="mb-6 max-w-md text-center text-muted-foreground text-sm">
          A drag-and-drop workflow builder will be displayed here. You'll be
          able to add triggers, actions, conditions, and connect them to create
          automated workflows.
        </p>
        <div className="flex gap-3">
          <Button variant="outline">
            <Icons.Plus className="mr-2" size={16} />
            Add Trigger
          </Button>
          <Button variant="outline">
            <Icons.Plus className="mr-2" size={16} />
            Add Action
          </Button>
        </div>
      </div>
    </div>
  );
}
