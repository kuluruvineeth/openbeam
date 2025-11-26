"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  targetType: "all" | "percentage" | "users" | "groups";
  targetPercentage?: number;
};

function FeatureFlagRow({
  flag,
  onToggle,
}: {
  flag: FeatureFlag;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-border border-b p-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="font-medium text-foreground">{flag.name}</h3>
          <span className="bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
            {flag.key}
          </span>
        </div>
        {flag.description && (
          <p className="text-muted-foreground text-sm">{flag.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Target:</span>
          <span className="text-foreground capitalize">
            {flag.targetType}
            {flag.targetType === "percentage" &&
              flag.targetPercentage !== undefined &&
              ` (${flag.targetPercentage}%)`}
          </span>
        </div>
      </div>
      <button
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          flag.enabled ? "bg-primary" : "bg-muted"
        )}
        onClick={onToggle}
        type="button"
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            flag.enabled ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const trpc = useTRPC();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery(
    trpc.enterprise.listFeatureFlags.queryOptions()
  );

  // Mock data for now
  const flags: FeatureFlag[] = [
    {
      id: "1",
      key: "ai_answers",
      name: "AI Answers",
      description: "Show AI-generated answers in search results",
      enabled: true,
      targetType: "all",
    },
    {
      id: "2",
      key: "workflow_builder",
      name: "Workflow Builder",
      description: "Enable the visual workflow builder",
      enabled: false,
      targetType: "percentage",
      targetPercentage: 25,
    },
    {
      id: "3",
      key: "advanced_analytics",
      name: "Advanced Analytics",
      description: "Detailed analytics dashboard",
      enabled: true,
      targetType: "groups",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Feature Flags</h1>
          <p className="text-muted-foreground text-sm">
            Control feature availability for your team
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Icons.Plus className="mr-2" size={16} />
          New Flag
        </Button>
      </div>

      {/* Feature Flags List */}
      <div className="border border-border bg-background">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : flags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.Settings className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              No feature flags
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Create your first feature flag to control feature rollout
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Feature Flag
            </Button>
          </div>
        ) : (
          flags.map((flag) => (
            <FeatureFlagRow
              flag={flag}
              key={flag.id}
              onToggle={() => {
                // TODO: Implement toggle via tRPC
              }}
            />
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-6 border border-border bg-muted/50 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-medium text-foreground text-sm">
          <Icons.Info size={16} />
          About Feature Flags
        </h3>
        <p className="text-muted-foreground text-sm">
          Feature flags allow you to gradually roll out new features, A/B test
          functionality, or quickly disable features if issues arise. Target
          flags to all users, a percentage of users, or specific groups.
        </p>
      </div>
    </div>
  );
}
