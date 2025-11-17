"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";

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
  "/history": () => <Icons.History size={20} />,
  "/workflow": () => <Icons.Workflow size={20} />,
  "/messages": () => <Icons.Messages size={20} />,
  "/agents": () => <Icons.Agents size={20} />,
  "/integrations": () => <Icons.Integrations size={20} />,
  "/knowledge-management": () => <Icons.KnowledgeManagement size={20} />,
  "/settings": () => <Icons.Settings size={20} />,
} as const;

const items: MenuItems = [
  {
    path: "/",
    name: "New",
  },
  {
    path: "/history",
    name: "Chat History",
    children: [
      { path: "/history/favourites", name: "Favourite chats" },
      { path: "/history/all", name: "All chats" },
    ],
  },
  {
    path: "/workflow",
    name: "Workflow Builder",
    children: [
      { path: "/workflow/workflow", name: "Workflow" },
      { path: "/workflow/executions", name: "Executions" },
    ],
  },
  {
    path: "/messages",
    name: "Messages",
    children: [
      { path: "/messages/direct", name: "Direct messages" },
      { path: "/messages/channels", name: "Channels" },
      { path: "/messages/call-history", name: "Call history" },
    ],
  },
  {
    path: "/agents",
    name: "Agents",
    children: [
      { path: "/agents/all", name: "All" },
      { path: "/agents/shared", name: "Shared With Me" },
      { path: "/agents/mine", name: "Made By Me" },
    ],
  },
  {
    path: "/integrations",
    name: "Integrations",
    children: [
      { path: "/integrations/all", name: "All" },
      { path: "/integrations/connected", name: "Connected" },
    ],
  },
  {
    path: "/knowledge-management",
    name: "Knowledge Management",
  },
  {
    path: "/settings",
    name: "Settings",
    children: [
      { path: "/settings", name: "General" },
      { path: "/settings/billing", name: "Billing" },
      { path: "/settings/analytics", name: "Analytics" },
      { path: "/settings/members", name: "Members" },
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
        {/* Child item text */}
        <div
          className={cn(
            "mr-[15px] ml-[35px] flex h-[32px] items-center",
            "border-[#DCDAD2] border-l pl-3 dark:border-[#2C2C2C]",
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
              "text-[#888] group-hover/child:text-primary",
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
  // Children should be visible when: expanded sidebar AND this item is expanded
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
          {/* Background that expands */}
          <div
            className={cn(
              "mr-[15px] ml-[15px] h-[40px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isActive &&
                "border-[#DCDAD2] bg-[#F2F1EF] dark:border-[#2C2C2C] dark:bg-secondary",
              isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]"
            )}
          />

          {/* Icon - always in same position from sidebar edge */}
          <div className="group-hover:!text-primary pointer-events-none absolute top-0 left-[15px] flex h-[40px] w-[40px] items-center justify-center text-black dark:text-[#666666]">
            <div className={cn(isActive && "dark:!text-white")}>
              <Icon />
            </div>
          </div>

          {isExpanded && (
            <div className="pointer-events-none absolute top-0 right-[4px] left-[55px] flex h-[40px] items-center">
              <span
                className={cn(
                  "font-medium text-[#666] text-sm transition-opacity duration-200 ease-in-out group-hover:text-primary",
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
                    "pointer-events-auto text-[#888] hover:text-primary",
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

      {/* Children */}
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
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Reset expanded item when sidebar expands/collapses
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
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive = isItemActive(item.path);

            return (
              <Item
                isActive={isActive}
                isExpanded={isExpanded}
                isItemExpanded={expandedItem === item.path}
                item={item}
                key={item.path}
                onSelect={onSelect}
                onToggle={(path) => {
                  setExpandedItem(expandedItem === path ? null : path);
                }}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
