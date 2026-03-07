"use client";

import { Button, Icons } from "@openbeam/ui";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
};

function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-border/50 border-dashed bg-muted/30 p-8 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-base">{title}</h3>
      <p className="mt-1 max-w-sm text-muted-foreground text-sm">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}

function AgentsEmptyState() {
  return (
    <EmptyState
      action={{
        label: "Create Agent",
        href: "/agents/new",
      }}
      description="Create your first agent to automate workflows and connect to your data sources."
      icon={<Icons.Plus className="text-muted-foreground" size={24} />}
      title="No agents yet"
    />
  );
}

function AgentsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      action={{
        label: "Clear Filters",
        onClick: onClear,
      }}
      description="Try adjusting your search or filter to find what you're looking for."
      icon={<Icons.Search className="text-muted-foreground" size={24} />}
      title="No results found"
    />
  );
}

export { AgentsEmptyState, AgentsNoResults, EmptyState };
export type { EmptyStateProps };
