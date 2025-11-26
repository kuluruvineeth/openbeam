"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type ActionInput = {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: string;
};

type Action = {
  id: string;
  name: string;
  description?: string;
  category: string;
  isAiEnabled: boolean;
  requiresConfirmation: boolean;
  inputs: ActionInput[];
};

// Mock action detail
const MOCK_ACTION: Action = {
  id: "1",
  name: "Create Google Doc",
  description:
    "Create a new Google document with specified content. The document will be created in your Google Drive and can be shared with others.",
  category: "Documents",
  isAiEnabled: true,
  requiresConfirmation: false,
  inputs: [
    {
      name: "title",
      type: "string",
      description: "Title of the document",
      required: true,
    },
    {
      name: "content",
      type: "text",
      description: "Initial content for the document",
      required: false,
    },
    {
      name: "folder",
      type: "string",
      description: "Folder ID to create the document in",
      required: false,
    },
  ],
};

export default function ActionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const actionId = params.id as string;

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  // Use mock data
  const action = MOCK_ACTION;
  const isLoading = false;
  const error = null;

  const handleExecute = async (dryRun = false) => {
    setIsExecuting(true);

    // TODO: Implement via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (dryRun) {
      toast.success("Dry run completed - no changes made");
    } else {
      toast.success("Action executed successfully");
    }

    setIsExecuting(false);
  };

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">Action not found</h3>
        <Button onClick={() => router.push("/actions")} variant="outline">
          Back to actions
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <Button
            onClick={() => router.push("/actions")}
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowLeft size={18} />
          </Button>
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
                <Icons.ToolsIcon size={24} />
              </div>
              <div>
                <h1 className="font-f37-stout text-xl">{action.name}</h1>
                <p className="text-muted-foreground text-sm capitalize">
                  {action.category}
                </p>
              </div>
            </div>
          )}
        </div>

        {action.description && (
          <p className="text-muted-foreground">{action.description}</p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {action.isAiEnabled && (
            <span className="bg-purple-500/10 px-2 py-1 text-purple-500 text-xs">
              AI-enabled
            </span>
          )}
          {action.requiresConfirmation && (
            <span className="bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">
              Requires confirmation
            </span>
          )}
        </div>
      </div>

      {/* Input Form */}
      <div className="mb-8">
        <h2 className="mb-4 font-medium text-foreground">Inputs</h2>
        <div className="space-y-4">
          {action.inputs.map((input) => (
            <div key={input.name}>
              <label className="mb-2 flex items-center gap-2 text-foreground text-sm">
                <span className="font-medium">{input.name}</span>
                {input.required && <span className="text-destructive">*</span>}
              </label>
              {input.description && (
                <p className="mb-2 text-muted-foreground text-xs">
                  {input.description}
                </p>
              )}
              {input.type === "text" ? (
                <textarea
                  className="h-24 w-full resize-none border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onChange={(e) =>
                    setInputValues({
                      ...inputValues,
                      [input.name]: e.target.value,
                    })
                  }
                  placeholder={input.default || `Enter ${input.name}...`}
                  value={inputValues[input.name] || ""}
                />
              ) : (
                <Input
                  onChange={(e) =>
                    setInputValues({
                      ...inputValues,
                      [input.name]: e.target.value,
                    })
                  }
                  placeholder={input.default || `Enter ${input.name}...`}
                  value={inputValues[input.name] || ""}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Execute */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={isExecuting}
          onClick={() => handleExecute(true)}
          variant="outline"
        >
          Dry Run
        </Button>
        <Button
          className="flex-1"
          disabled={isExecuting}
          onClick={() => handleExecute(false)}
        >
          {isExecuting ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Executing...
            </>
          ) : (
            <>
              Execute
              <Icons.ArrowRight className="ml-2" size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
