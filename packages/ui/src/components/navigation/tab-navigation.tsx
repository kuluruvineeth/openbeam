"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  href?: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = "default",
  className,
}: TabNavigationProps) {
  const currentTab = activeTab || tabs[0]?.id;

  const handleTabClick = (tab: Tab) => {
    if (tab.href) {
      window.location.href = tab.href;
      return;
    }

    if (onTabChange) {
      onTabChange(tab.id);
    }
  };

  const variantStyles = {
    default: {
      container: "rounded-lg bg-muted p-1",
      tab: "rounded-md",
      activeTab: "bg-background shadow-sm",
    },
    pills: {
      container: "gap-2",
      tab: "rounded-full px-4",
      activeTab: "bg-primary text-primary-foreground",
    },
    underline: {
      container: "gap-4 border-border border-b",
      tab: "-mb-px border-transparent border-b-2 pb-3",
      activeTab: "border-primary text-foreground",
    },
  }[variant];

  return (
    <div
      className={cn("flex items-center", variantStyles.container, className)}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;

        return (
          <button
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 font-medium text-sm",
              "transition-colors",
              variantStyles.tab,
              isActive
                ? cn("text-foreground", variantStyles.activeTab)
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            type="button"
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  isActive ? "bg-primary/20" : "bg-muted"
                )}
              >
                {tab.count}
              </span>
            )}
            {variant === "default" && isActive && (
              <motion.div
                className="-z-10 absolute inset-0 rounded-md bg-background shadow-sm"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { TabNavigation };
export type { Tab, TabNavigationProps };
