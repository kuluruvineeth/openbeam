"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function NewCollectionPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[5]);
  const [visibility, setVisibility] = useState<"private" | "team" | "public">(
    "private"
  );

  const createMutation = useMutation(
    trpc.collections.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Collection created");
        router.push(`/library/collections/${data.id}`);
      },
      onError: () => {
        toast.error("Failed to create collection");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        visibility,
      });
    }
  };

  return (
    <div className="mx-auto max-w-xl py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-f37-stout text-xl">Create Collection</h1>
        <p className="text-muted-foreground text-sm">
          Organize documents and searches into a collection
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Preview */}
        <div className="mb-8 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icons.KnowledgeManagement className="text-white" size={32} />
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Name
          </label>
          <Input
            className="h-12"
            onChange={(e) => setName(e.target.value)}
            placeholder="My Collection"
            value={name}
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Description (optional)
          </label>
          <textarea
            className="h-24 w-full resize-none border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of this collection..."
            value={description}
          />
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Color
          </label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                className={cn(
                  "h-8 w-8 transition-transform hover:scale-110",
                  color === c && "ring-2 ring-foreground ring-offset-2"
                )}
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                type="button"
              />
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="mb-8">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Visibility
          </label>
          <div className="flex gap-2">
            <button
              className={cn(
                "flex-1 border p-3 text-sm transition-colors",
                visibility === "private"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setVisibility("private")}
              type="button"
            >
              <Icons.LockIcon className="mx-auto mb-1" size={18} />
              Private
            </button>
            <button
              className={cn(
                "flex-1 border p-3 text-sm transition-colors",
                visibility === "team"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setVisibility("team")}
              type="button"
            >
              <Icons.Agents className="mx-auto mb-1" size={18} />
              Team
            </button>
            <button
              className={cn(
                "flex-1 border p-3 text-sm transition-colors",
                visibility === "public"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setVisibility("public")}
              type="button"
            >
              <Icons.GlobeIcon className="mx-auto mb-1" size={18} />
              Public
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!name.trim() || createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? (
              <>
                <Icons.Spinner className="mr-2 animate-spin" size={16} />
                Creating...
              </>
            ) : (
              "Create Collection"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
