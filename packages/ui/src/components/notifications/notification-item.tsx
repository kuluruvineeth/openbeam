"use client";

import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Check, MoreHorizontal, Trash2 } from "lucide-react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

type NotificationType = "info" | "success" | "warning" | "error" | "agent";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const TYPE_STYLES: Record<NotificationType, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  agent: "bg-purple-500",
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  onDelete,
  onClick,
}: NotificationItemProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex gap-3 border-border/50 border-b p-4",
        "transition-colors hover:bg-muted/50",
        !notification.read && "bg-muted/30",
        onClick && "cursor-pointer"
      )}
      exit={{ opacity: 0, x: -100 }}
      initial={{ opacity: 0, y: -10 }}
      layout
      onClick={onClick}
    >
      <div
        className={cn(
          "mt-2 h-2 w-2 flex-shrink-0 rounded-full",
          TYPE_STYLES[notification.type]
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", !notification.read && "font-medium")}>
            {notification.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                size="icon"
                variant="ghost"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!notification.read && onMarkAsRead && (
                <DropdownMenuItem onClick={onMarkAsRead}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as read
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  {notification.archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {notification.description && (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {notification.description}
          </p>
        )}

        <p className="mt-2 text-muted-foreground text-xs">
          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

function NotificationItemSkeleton() {
  return (
    <div className="flex gap-3 border-border/50 border-b p-4">
      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/4 rounded bg-muted" />
      </div>
    </div>
  );
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onArchive,
  onDelete,
  onItemClick,
}: {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onItemClick?: (notification: Notification) => void;
}) {
  return (
    <AnimatePresence mode="popLayout">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onArchive={onArchive ? () => onArchive(notification.id) : undefined}
          onClick={onItemClick ? () => onItemClick(notification) : undefined}
          onDelete={onDelete ? () => onDelete(notification.id) : undefined}
          onMarkAsRead={
            onMarkAsRead ? () => onMarkAsRead(notification.id) : undefined
          }
        />
      ))}
    </AnimatePresence>
  );
}

export { NotificationItem, NotificationItemSkeleton, NotificationList };
export type { Notification, NotificationItemProps, NotificationType };
