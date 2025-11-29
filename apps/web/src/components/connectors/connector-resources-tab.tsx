"use client";

import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectorResources } from "@/hooks/use-connector";

type Resource = {
  id: string;
  name: string;
  resourceType: string;
};

type ConnectorResourcesTabProps = {
  connectorId: string;
};

function ResourcesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-1 h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={`resource-${i}`}
            >
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ConnectorResourcesTab({
  connectorId,
}: ConnectorResourcesTabProps) {
  const { data: resources, isLoading } = useConnectorResources(connectorId);

  if (isLoading) {
    return <ResourcesSkeleton />;
  }

  if (!resources || resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-sm">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border/50 bg-background">
              <Icons.Folder className="text-foreground/40" size={20} />
            </div>
            <p className="text-foreground/70 text-sm">No resources found</p>
            <p className="mt-1 text-foreground/40 text-xs">
              Resources will appear here once syncing begins
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const typedResources = resources as Resource[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-sm">Resources</CardTitle>
        <p className="mt-1 text-foreground/50 text-xs">
          Manage which resources are synced from this connector
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {typedResources.map((resource) => (
            <div
              className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-foreground/[0.02]"
              key={resource.id}
            >
              <div>
                <p className="font-medium text-sm">
                  {resource.name || "Unknown Resource"}
                </p>
                <p className="text-foreground/50 text-xs">
                  {resource.resourceType || "Unknown Type"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
