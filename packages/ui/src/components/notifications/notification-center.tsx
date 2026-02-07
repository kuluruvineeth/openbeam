"use client";

import { useMemo, useState } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { ScrollArea } from "../scroll-area";
import {
  type Notification,
  NotificationItemSkeleton,
  NotificationList,
} from "./notification-item";

type TabValue = "inbox" | "archived";

interface NotificationCenterProps {
  notifications: Notification[];
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onItemClick?: (notification: Notification) => void;
  onTabChange?: (tab: TabValue) => void;
}

function NotificationCenter({
  notifications,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onArchive,
  onDelete,
  onItemClick,
  onTabChange,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabValue>("inbox");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !(n.read || n.archived)).length,
    [notifications]
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n) => (tab === "inbox" ? !n.archived : n.archived)),
    [notifications, tab]
  );

  const handleTabChange = (newTab: TabValue) => {
    setTab(newTab);
    onTabChange?.(newTab);
  };

  function renderContent() {
    if (isLoading) {
      return (
        <>
          <NotificationItemSkeleton />
          <NotificationItemSkeleton />
          <NotificationItemSkeleton />
        </>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
          <Icons.Bell className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No notifications</p>
        </div>
      );
    }

    return (
      <NotificationList
        notifications={filteredNotifications}
        onArchive={onArchive}
        onDelete={onDelete}
        onItemClick={onItemClick}
        onMarkAsRead={onMarkAsRead}
      />
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="relative" size="icon" variant="ghost">
          <Icons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="-right-1 -top-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-border border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {tab === "inbox" && unreadCount > 0 && onMarkAllAsRead && (
            <Button onClick={onMarkAllAsRead} size="sm" variant="ghost">
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex border-border border-b">
          {(["inbox", "archived"] as const).map((t) => (
            <button
              className={cn(
                "-mb-px flex-1 border-b-2 py-2 font-medium text-sm",
                "transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              key={t}
              onClick={() => handleTabChange(t)}
              type="button"
            >
              {t === "inbox" ? "Inbox" : "Archived"}
            </button>
          ))}
        </div>

        <ScrollArea className="h-[400px]">{renderContent()}</ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationCenter };
export type { NotificationCenterProps, TabValue };
