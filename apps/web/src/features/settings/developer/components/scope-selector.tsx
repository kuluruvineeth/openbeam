"use client";

import { cva } from "class-variance-authority";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ScopeResource } from "../lib/scopes";

type ScopeSelectorProps = {
  resources: ScopeResource[];
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
};

type ScopeLevel = "none" | "read" | "write";

const radioVariants = cva(
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-primary bg-primary text-primary-foreground",
        false:
          "border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

const toggleVariants = cva(
  "cursor-pointer select-none rounded-sm border px-2 py-0.5 font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-primary/50 bg-primary/10 text-primary",
        false:
          "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

function resolveLevel(resource: ScopeResource, scopes: string[]): ScopeLevel {
  if (resource.writeScope && scopes.includes(resource.writeScope)) {
    return "write";
  }
  if (scopes.includes(resource.readScope)) {
    return "read";
  }
  return "none";
}

function applyScopeLevel(
  resource: ScopeResource,
  level: ScopeLevel,
  current: string[]
): string[] {
  const toRemove = new Set<string>();
  toRemove.add(resource.readScope);
  if (resource.writeScope) {
    toRemove.add(resource.writeScope);
  }

  const filtered = current.filter((s) => !toRemove.has(s));

  if (level === "read") {
    return [...filtered, resource.readScope];
  }
  if (level === "write") {
    const next = [...filtered, resource.readScope];
    if (resource.writeScope) {
      next.push(resource.writeScope);
    }
    return next;
  }
  return filtered.filter(
    (s) => !resource.extraScopes?.some((e) => e.scope === s)
  );
}

function toggleExtra(scope: string, current: string[]): string[] {
  return current.includes(scope)
    ? current.filter((s) => s !== scope)
    : [...current, scope];
}

function ResourceRow({
  resource,
  selectedScopes,
  onChange,
}: {
  resource: ScopeResource;
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
}) {
  const level = resolveLevel(resource, selectedScopes);

  const handleLevel = useCallback(
    (next: ScopeLevel) => {
      onChange(applyScopeLevel(resource, next, selectedScopes));
    },
    [resource, selectedScopes, onChange]
  );

  const handleExtra = useCallback(
    (scope: string) => {
      onChange(toggleExtra(scope, selectedScopes));
    },
    [selectedScopes, onChange]
  );

  const levels: { value: ScopeLevel; label: string; enabled: boolean }[] = [
    { value: "none", label: "N", enabled: true },
    { value: "read", label: "R", enabled: true },
    { value: "write", label: "W", enabled: Boolean(resource.writeScope) },
  ];

  return (
    <div className="flex items-center gap-3 border-border/50 border-b py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{resource.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {resource.description}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {levels.map((l) => (
          <button
            className={cn(
              radioVariants({ active: level === l.value }),
              !l.enabled && "pointer-events-none opacity-30"
            )}
            disabled={!l.enabled}
            key={l.value}
            onClick={() => handleLevel(l.value)}
            type="button"
          >
            {l.label}
          </button>
        ))}
      </div>

      {resource.extraScopes && resource.extraScopes.length > 0 && (
        <div className="flex items-center gap-1">
          {resource.extraScopes.map((extra) => (
            <button
              className={toggleVariants({
                active: selectedScopes.includes(extra.scope),
              })}
              key={extra.scope}
              onClick={() => handleExtra(extra.scope)}
              type="button"
            >
              {extra.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScopeSelector({
  resources,
  selectedScopes,
  onChange,
}: ScopeSelectorProps) {
  return (
    <div className="rounded-sm border border-border/50">
      <div className="flex items-center gap-3 border-border/50 border-b px-3 py-1.5">
        <span className="min-w-0 flex-1 font-medium text-muted-foreground text-xs">
          Resource
        </span>
        <div className="flex items-center gap-1">
          <span className="flex h-7 w-7 items-center justify-center text-[10px] text-muted-foreground">
            N
          </span>
          <span className="flex h-7 w-7 items-center justify-center text-[10px] text-muted-foreground">
            R
          </span>
          <span className="flex h-7 w-7 items-center justify-center text-[10px] text-muted-foreground">
            W
          </span>
        </div>
      </div>
      <div className="px-3">
        {resources.map((resource) => (
          <ResourceRow
            key={resource.id}
            onChange={onChange}
            resource={resource}
            selectedScopes={selectedScopes}
          />
        ))}
      </div>
    </div>
  );
}
