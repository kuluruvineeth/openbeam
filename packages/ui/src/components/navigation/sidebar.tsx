"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, type ReactNode, useContext, useState } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggle = () => setIsCollapsed((prev) => !prev);
  const expand = () => setIsCollapsed(false);
  const collapse = () => setIsCollapsed(true);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, expand, collapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps {
  children: ReactNode;
  className?: string;
}

function Sidebar({ children, className }: SidebarProps) {
  const { isCollapsed, toggle } = useSidebar();

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 240 }}
      className={cn(
        "relative flex h-full flex-col",
        "border-border border-r bg-background",
        className
      )}
      initial={false}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {children}

      <Button
        className="-right-3 absolute top-6 h-6 w-6 rounded-full border border-border bg-background shadow-sm"
        onClick={toggle}
        size="icon"
        variant="ghost"
      >
        {isCollapsed ? (
          <Icons.ChevronRight className="h-3 w-3" />
        ) : (
          <Icons.ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </motion.aside>
  );
}

interface SidebarNavItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: number | string;
}

function SidebarNavItem({
  icon,
  label,
  href,
  onClick,
  isActive,
  badge,
}: SidebarNavItemProps) {
  const { isCollapsed } = useSidebar();

  const content = (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2",
        "transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex-shrink-0">{icon}</span>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            animate={{ opacity: 1, width: "auto" }}
            className="flex-1 truncate text-left font-medium text-sm"
            exit={{ opacity: 0, width: 0 }}
            initial={{ opacity: 0, width: 0 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge && !isCollapsed && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground text-xs">
          {badge}
        </span>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {href ? <a href={href}>{content}</a> : content}
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}
            {badge && ` (${badge})`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return href ? <a href={href}>{content}</a> : content;
}

export { Sidebar, SidebarNavItem, SidebarProvider, useSidebar };
export type { SidebarNavItemProps, SidebarProps, SidebarProviderProps };
