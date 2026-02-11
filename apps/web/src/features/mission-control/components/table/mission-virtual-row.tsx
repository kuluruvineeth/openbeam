"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  type CellHandlers,
  type MissionRow,
  missionColumns,
} from "./mission-columns";

type MissionVirtualRowProps = {
  row: MissionRow;
  style: React.CSSProperties;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onToggleSelection: () => void;
  allSelected: boolean;
  onToggleAll: () => void;
};

const MissionVirtualRow = memo(function MissionVirtualRowInner({
  row,
  style,
  isSelected,
  isFocused,
  onClick,
  onToggleSelection,
  allSelected,
  onToggleAll,
}: MissionVirtualRowProps) {
  const handlers: CellHandlers = {
    isSelected,
    onToggleSelection,
    allSelected,
    onToggleAll,
  };

  return (
    <tr
      className={cn(
        "absolute top-0 left-0 flex w-full cursor-pointer transition-colors",
        "border-border/30 border-b hover:bg-muted/50",
        isSelected && "bg-primary/5",
        isFocused && "ring-1 ring-primary/50"
      )}
      onClick={onClick}
      style={style}
    >
      {missionColumns.map((col) => (
        <td
          className={cn(
            "flex items-center px-3 text-sm",
            col.align === "right" && "justify-end"
          )}
          key={col.id}
          style={{
            width: col.width === 0 ? undefined : col.width,
            flex: col.width === 0 ? 1 : `0 0 ${col.width}px`,
          }}
        >
          {col.renderCell(row, handlers)}
        </td>
      ))}
    </tr>
  );
});

export { MissionVirtualRow };
export type { MissionVirtualRowProps };
