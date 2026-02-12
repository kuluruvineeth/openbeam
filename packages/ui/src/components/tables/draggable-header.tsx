"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icons } from "../icons";
import { TableHead } from "../table";

interface DraggableHeaderProps {
  id: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

function DraggableHeader({
  id,
  children,
  className,
  style,
  disabled = false,
}: DraggableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const dragStyle: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...style,
  };

  return (
    <TableHead
      className={cn(
        "group/header relative flex h-full select-none items-center border-border border-t p-0 px-3",
        "shadow-none outline-none ring-0 hover:shadow-none focus:shadow-none focus:outline-none focus:ring-0",
        isDragging && "z-50 border border-border bg-background",
        className
      )}
      ref={setNodeRef}
      style={dragStyle}
    >
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {!disabled && (
        <Icons.GripVertical
          className="-translate-y-1/2 absolute top-1/2 right-1 cursor-grab text-muted-foreground opacity-0 active:cursor-grabbing group-hover/header:opacity-100"
          size={14}
          {...attributes}
          {...listeners}
        />
      )}
    </TableHead>
  );
}

export { DraggableHeader };
export type { DraggableHeaderProps };
