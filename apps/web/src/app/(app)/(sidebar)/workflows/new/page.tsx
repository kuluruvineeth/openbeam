"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "blank",
    name: "Blank Workflow",
    description: "Start from scratch",
    icon: Icons.Plus,
  },
  {
    id: "weekly-report",
    name: "Weekly Report",
    description: "Generate automated weekly reports",
    icon: Icons.FileTextIcon,
  },
  {
    id: "notification",
    name: "Notification Workflow",
    description: "Send notifications on events",
    icon: Icons.Messages,
  },
  {
    id: "cleanup",
    name: "Content Cleanup",
    description: "Archive or delete stale content",
    icon: Icons.XIcon,
  },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    // TODO: Implement via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Workflow created");
    router.push("/workflows/new-id"); // Would be actual ID
  };

  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-f37-stout text-xl">Create Workflow</h1>
        <p className="text-muted-foreground">
          Automate tasks with a custom workflow
        </p>
      </div>

      {/* Name */}
      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Name
        </label>
        <Input
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workflow"
          value={name}
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Description (optional)
        </label>
        <textarea
          className="h-20 w-full resize-none border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this workflow do?"
          value={description}
        />
      </div>

      {/* Templates */}
      <div className="mb-8">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Start from template
        </label>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                className={cn(
                  "flex items-start gap-3 border p-4 text-left transition-colors",
                  selectedTemplate === template.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                type="button"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {template.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={() => router.back()}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!name.trim() || isCreating}
          onClick={handleCreate}
        >
          {isCreating ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Creating...
            </>
          ) : (
            "Create Workflow"
          )}
        </Button>
      </div>
    </div>
  );
}
