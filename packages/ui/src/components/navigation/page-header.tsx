"use client";

import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Breadcrumb } from "./breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
}

function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {tabs}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
