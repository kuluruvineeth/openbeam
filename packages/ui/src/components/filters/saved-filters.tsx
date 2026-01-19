"use client";

import { Bookmark, Edit2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../input";

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  isDefault?: boolean;
}

interface SavedFiltersProps {
  filters: SavedFilter[];
  currentFilters: Record<string, unknown>;
  onApply: (filters: Record<string, unknown>) => void;
  onSave: (name: string, filters: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  className?: string;
}

function SavedFilters({
  filters,
  currentFilters,
  onApply,
  onSave,
  onDelete,
  className,
}: SavedFiltersProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  const handleSave = () => {
    if (!filterName.trim()) {
      return;
    }
    onSave(filterName.trim(), currentFilters);
    setSaveDialogOpen(false);
    setFilterName("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Saved Filters
        </h4>
        {hasActiveFilters && (
          <Button
            className="h-6 px-2"
            onClick={() => setSaveDialogOpen(true)}
            size="sm"
            variant="ghost"
          >
            <Plus className="mr-1 h-3 w-3" />
            Save
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {filters.map((filter) => (
          <div
            className="group flex items-center gap-2 rounded-md p-2 hover:bg-muted"
            key={filter.id}
          >
            <button
              className="flex flex-1 items-center gap-2 text-left"
              onClick={() => onApply(filter.filters)}
              type="button"
            >
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-sm">{filter.name}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  size="sm"
                  variant="ghost"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onApply(filter.filters)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Apply
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(filter.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {filters.length === 0 && (
          <p className="py-2 text-muted-foreground text-xs">
            No saved filters yet
          </p>
        )}
      </div>

      <Dialog onOpenChange={setSaveDialogOpen} open={saveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Filter name"
            value={filterName}
          />
          <DialogFooter>
            <Button onClick={() => setSaveDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!filterName.trim()} onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { SavedFilters };
export type { SavedFilter, SavedFiltersProps };
