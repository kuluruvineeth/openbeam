"use client";

import { createEndNodeData, createStartNodeData } from "@openplane/ui";
import { ColorPicker, EmojiPicker } from "@openplane/ui/components/forms";
import { Input } from "@openplane/ui/components/input";
import { Label } from "@openplane/ui/components/label";
import { StepModal } from "@openplane/ui/components/modals";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { Textarea } from "@openplane/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useAgentCreationParams } from "../hooks/use-agent-creation-params";

const DEFAULT_NODES = [
  {
    id: "start-1",
    type: "start" as const,
    position: { x: 250, y: 50 },
    data: createStartNodeData(),
  },
  {
    id: "end-1",
    type: "end" as const,
    position: { x: 250, y: 400 },
    data: createEndNodeData(),
  },
];

const DEFAULT_EDGES: { id: string; source: string; target: string }[] = [];

type FormData = {
  name: string;
  description: string;
  icon: string;
  color: string;
};

const INITIAL_FORM_DATA: FormData = {
  name: "",
  description: "",
  icon: "🤖",
  color: "#3b82f6",
};

function ConfigureStep({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <EmojiPicker onSelect={(emoji) => onChange({ icon: emoji })}>
            <button
              className="flex h-16 w-16 items-center justify-center rounded-md border border-border transition-colors hover:bg-muted"
              style={{ backgroundColor: `${data.color}20` }}
              type="button"
            >
              <span className="text-3xl">{data.icon}</span>
            </button>
          </EmojiPicker>
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g., Research Assistant"
              value={data.name}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker
              onChange={(color) => onChange({ color })}
              showInput={false}
              value={data.color}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what this agent does..."
          rows={2}
          value={data.description}
        />
      </div>
    </div>
  );
}

function ReviewStep({ data }: { data: FormData }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-md border p-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-md"
          style={{ backgroundColor: `${data.color}20` }}
        >
          <span className="text-3xl">{data.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-lg">
            {data.name || "Untitled Agent"}
          </h3>
          <p className="truncate text-muted-foreground text-sm">
            {data.description || "No description"}
          </p>
        </div>
        <div
          className="h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: data.color }}
        />
      </div>
    </div>
  );
}

function parseIcon(icon: string | null): { emoji: string; color: string } {
  if (!icon) {
    return { emoji: "🤖", color: "#3b82f6" };
  }
  const parts = icon.split("|");
  if (parts.length === 2) {
    return { emoji: parts[0] || "🤖", color: parts[1] || "#3b82f6" };
  }
  return { emoji: icon || "🤖", color: "#3b82f6" };
}

function LoadingStep() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-16 w-16 rounded-md" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton className="h-10 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}

export function AgentCreationSheet() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isOpen, isEditMode, editingAgentId, close } =
    useAgentCreationParams();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: agentData, isLoading: isLoadingAgent } = useQuery({
    ...trpc.agentCanvas.get.queryOptions({ canvasId: editingAgentId ?? "" }),
    enabled: isEditMode && !!editingAgentId,
  });

  useEffect(() => {
    if (isEditMode && agentData && !hasInitialized) {
      const { emoji, color } = parseIcon(agentData.icon);

      setFormData({
        name: agentData.name,
        description: agentData.description || "",
        icon: emoji,
        color,
      });
      setHasInitialized(true);
    }
  }, [isEditMode, agentData, hasInitialized]);

  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen]);

  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const createMutation = useMutation({
    ...trpc.agentCanvas.create.mutationOptions(),
    onSuccess: (data) => {
      toast.success("Agent created successfully");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.list.infiniteQueryOptions({}).queryKey,
      });
      handleClose();
      router.push(`/agents/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    ...trpc.agentCanvas.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Agent updated successfully");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.list.infiniteQueryOptions({}).queryKey,
      });
      if (editingAgentId) {
        queryClient.invalidateQueries({
          queryKey: trpc.agentCanvas.get.queryOptions({
            canvasId: editingAgentId,
          }).queryKey,
        });
      }
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    close();
    setFormData(INITIAL_FORM_DATA);
    setHasInitialized(false);
  };

  const handleComplete = async () => {
    if (!formData.name.trim()) {
      return;
    }

    if (isEditMode && editingAgentId) {
      await updateMutation.mutateAsync({
        canvasId: editingAgentId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: `${formData.icon}|${formData.color}`,
      });
    } else {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: `${formData.icon}|${formData.color}`,
        nodes: DEFAULT_NODES,
        edges: DEFAULT_EDGES,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const showLoading = isEditMode && isLoadingAgent;

  const steps = [
    {
      id: "configure",
      title: "Configure",
      description: isEditMode ? "Update your agent" : "Set up your agent",
      content: showLoading ? (
        <LoadingStep />
      ) : (
        <ConfigureStep data={formData} onChange={updateFormData} />
      ),
      isValid: () => !showLoading && formData.name.trim().length > 0,
    },
    {
      id: "review",
      title: "Review",
      description: isEditMode ? "Review and update" : "Review and create",
      content: <ReviewStep data={formData} />,
      isValid: () => true,
    },
  ];

  return (
    <StepModal
      completeLabel={isEditMode ? "Update Agent" : "Create Agent"}
      isSubmitting={isSubmitting}
      onComplete={handleComplete}
      onOpenChange={(open) => !open && handleClose()}
      open={isOpen}
      steps={steps}
      title={isEditMode ? "Edit Agent" : "Create New Agent"}
    />
  );
}
