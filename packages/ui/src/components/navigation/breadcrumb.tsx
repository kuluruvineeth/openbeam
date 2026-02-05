"use client";

import { Fragment, type ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Icons } from "../icons";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  separator?: ReactNode;
  className?: string;
}

function Breadcrumb({
  items,
  showHome = true,
  separator = <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />,
  className,
}: BreadcrumbProps) {
  const allItems = showHome
    ? [
        { label: "Home", href: "/", icon: <Icons.Home className="h-4 w-4" /> },
        ...items,
      ]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center">
                {item.href && !isLast ? (
                  <a
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      "text-muted-foreground transition-colors hover:text-foreground"
                    )}
                    href={item.href}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      isLast
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
              {!isLast && <li className="flex items-center">{separator}</li>}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
export type { BreadcrumbItem, BreadcrumbProps };
