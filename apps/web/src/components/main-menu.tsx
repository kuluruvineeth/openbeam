"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type MenuItem = {
  readonly path: string;
  readonly name: string;
  readonly children?: readonly {
    readonly path: string;
    readonly name: string;
  }[];
};

type MenuItems = readonly MenuItem[];

const icons: Record<string, () => React.ReactElement> = {
  "/": () => <Icons.Plus size={20} />,
  "/connectors": () => <Icons.ConnectorIcon size={20} />,
  "/search": () => <Icons.Search size={20} />,
  "/agents": () => <Icons.Agents size={20} />,
  "/control": () => <Icons.Settings2 size={20} />,
} as const;

const items: MenuItems = [
  {
    path: "/",
    name: "New",
  },
  {
    path: "/connectors",
    name: "Connectors",
  },
  {
    path: "/search",
    name: "Search",
  },
  {
    path: "/agents",
    name: "Agents",
  },
  {
    path: "/control",
    name: "Control",
    children: [
      { path: "/control", name: "Dashboard" },
      { path: "/control/agents", name: "Agents" },
      { path: "/control/issues", name: "Issues" },
      { path: "/control/projects", name: "Projects" },
      { path: "/control/goals", name: "Goals" },
      { path: "/control/approvals", name: "Approvals" },
      { path: "/control/costs", name: "Costs" },
      { path: "/control/activity", name: "Activity" },
      { path: "/control/settings", name: "Settings" },
    ],
  },
] as const;

type ItemProps = {
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  isItemExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect?: () => void;
};

type ChildItemProps = {
  child: { readonly path: string; readonly name: string };
  isActive: boolean;
  isExpanded: boolean;
  shouldShow: boolean;
  onSelect?: () => void;
  index: number;
};

const ChildItem = ({
  child,
  isActive,
  isExpanded,
  shouldShow,
  onSelect,
  index,
}: ChildItemProps) => {
  const showChild = isExpanded && shouldShow;

  return (
    <Link
      className="group/child block"
      href={child.path as "/"}
      onClick={() => onSelect?.()}
      prefetch
    >
      <div className="relative">
        <div
          className={cn(
            "mr-[15px] ml-[35px] flex h-[32px] items-center",
            "border-border border-l pl-3",
            "transition-all duration-200 ease-out",
            showChild ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
          )}
          style={{
            transitionDelay: showChild
              ? `${40 + index * 20}ms`
              : `${index * 20}ms`,
          }}
        >
          <span
            className={cn(
              "font-medium text-xs transition-colors duration-200",
              "text-muted-foreground group-hover/child:text-primary",
              "overflow-hidden whitespace-nowrap",
              isActive && "text-primary"
            )}
          >
            {child.name}
          </span>
        </div>
      </div>
    </Link>
  );
};

const Item = ({
  item,
  isActive,
  isExpanded,
  isItemExpanded,
  onToggle,
  onSelect,
}: ItemProps) => {
  const Icon = icons[item.path as keyof typeof icons];
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const shouldShowChildren = isExpanded && isItemExpanded;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(item.path);
  };

  return (
    <div className="group">
      <Link
        className="group"
        href={item.path as "/"}
        onClick={() => onSelect?.()}
        prefetch
      >
        <div className="relative">
          <div
            className={cn(
              "mr-[15px] ml-[15px] h-[40px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isActive && "border-border bg-secondary",
              isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]"
            )}
          />

          <div className="group-hover:!text-primary pointer-events-none absolute top-0 left-[15px] flex h-[40px] w-[40px] items-center justify-center text-foreground dark:text-muted-foreground">
            <div className={cn(isActive && "dark:!text-white")}>
              <Icon />
            </div>
          </div>

          {isExpanded && (
            <div className="pointer-events-none absolute top-0 right-[4px] left-[55px] flex h-[40px] items-center">
              <span
                className={cn(
                  "font-medium text-muted-foreground text-sm transition-opacity duration-200 ease-in-out group-hover:text-primary",
                  "overflow-hidden whitespace-nowrap",
                  hasChildren ? "pr-2" : "",
                  isActive && "text-primary"
                )}
              >
                {item.name}
              </span>
              {hasChildren && (
                <button
                  className={cn(
                    "mr-3 ml-auto flex h-8 w-8 items-center justify-center transition-all duration-200",
                    "pointer-events-auto text-muted-foreground hover:text-primary",
                    isActive && "text-primary/60",
                    shouldShowChildren && "rotate-180"
                  )}
                  onClick={handleChevronClick}
                  type="button"
                >
                  <Icons.ChevronDown size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </Link>

      {hasChildren && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            shouldShowChildren ? "mt-1 max-h-96" : "max-h-0"
          )}
        >
          {item.children?.map((child, index) => {
            const isChildActive = pathname === child.path;

            return (
              <ChildItem
                child={child}
                index={index}
                isActive={isChildActive}
                isExpanded={isExpanded}
                key={child.path}
                onSelect={onSelect}
                shouldShow={shouldShowChildren}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

type Props = {
  onSelect?: () => void;
  isExpanded?: boolean;
};

export function MainMenu({ onSelect, isExpanded = false }: Props) {
  "use no memo";
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset when isExpanded prop changes
  useEffect(() => {
    setExpandedItem(null);
  }, [isExpanded]);

  const isItemActive = (itemPath: string): boolean => {
    if (pathname === "/" && itemPath === "/") {
      return true;
    }
    if (itemPath === "/") {
      return false;
    }

    return pathname?.startsWith(itemPath) ?? false;
  };

  return (
    <div className="mt-6 w-full">
      <nav aria-label="Main navigation" className="w-full">
        <ul className="flex list-none flex-col gap-2">
          {items.map((item) => {
            const isActive = isItemActive(item.path);

            return (
              <li key={item.path}>
                <Item
                  isActive={isActive}
                  isExpanded={isExpanded}
                  isItemExpanded={expandedItem === item.path}
                  item={item}
                  onSelect={onSelect}
                  onToggle={(path) => {
                    setExpandedItem(expandedItem === path ? null : path);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
