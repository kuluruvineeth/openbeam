"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoryEntry, MemoryScope } from "../hooks/use-memory";

const scopeToggleVariants = cva(
  "flex-1 rounded-sm px-3 py-1.5 font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted",
      },
    },
    defaultVariants: { active: false },
  }
);

const WRITABLE_SCOPES: Exclude<MemoryScope, "all">[] = [
  "mission",
  "agent",
  "task",
];
const KEY_MAX_LENGTH = 200;

type MemoryEditDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, value: unknown, scope: MemoryScope) => void;
  entry?: MemoryEntry;
  agents: { id: string; name: string }[];
};

function tryParseJson(text: string): { parsed: unknown; valid: boolean } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { parsed: text, valid: true };
  }

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return { parsed: JSON.parse(trimmed), valid: true };
    } catch {
      return { parsed: text, valid: false };
    }
  }

  return { parsed: text, valid: true };
}

export function MemoryEditDialog({
  isOpen,
  onClose,
  onSave,
  entry,
  agents,
}: MemoryEditDialogProps) {
  const [key, setKey] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [scope, setScope] = useState<Exclude<MemoryScope, "all">>("mission");
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setKey(entry.key);
        setRawValue(
          typeof entry.value === "string"
            ? entry.value
            : JSON.stringify(entry.value, null, 2)
        );
        setScope(
          entry.scope === "all"
            ? "mission"
            : (entry.scope as Exclude<MemoryScope, "all">)
        );
        setSelectedAgent(entry.agentName ?? "");
      } else {
        setKey("");
        setRawValue("");
        setScope("mission");
        setSelectedAgent("");
      }
    }
  }, [isOpen, entry]);

  const { valid: isValidJson } = useMemo(
    () => tryParseJson(rawValue),
    [rawValue]
  );

  const canSave =
    key.trim().length > 0 && key.length <= KEY_MAX_LENGTH && isValidJson;

  const handleSave = useCallback(() => {
    if (!canSave) {
      return;
    }
    const { parsed } = tryParseJson(rawValue);
    onSave(key.trim(), parsed, scope);
    onClose();
  }, [canSave, key, rawValue, scope, onSave, onClose]);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {entry ? "Edit Memory Entry" : "New Memory Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="memory-key">
              Key
            </Label>
            <Input
              id="memory-key"
              maxLength={KEY_MAX_LENGTH}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. research_findings"
              value={key}
            />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {key.length}/{KEY_MAX_LENGTH}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs" htmlFor="memory-value">
                Value
              </Label>
              {rawValue.trim().length > 0 && (
                <span
                  className={`text-[10px] ${isValidJson ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {isValidJson ? "Valid" : "Invalid JSON"}
                </span>
              )}
            </div>
            <Textarea
              className="min-h-[120px] font-mono text-xs"
              id="memory-value"
              onChange={(e) => setRawValue(e.target.value)}
              placeholder='Plain text or JSON (e.g. {"key": "value"})'
              value={rawValue}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Scope</Label>
            <div className="flex gap-1 rounded-sm border border-border/50 p-0.5">
              {WRITABLE_SCOPES.map((s) => (
                <button
                  className={scopeToggleVariants({ active: scope === s })}
                  key={s}
                  onClick={() => setScope(s)}
                  type="button"
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {scope === "agent" && agents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Agent</Label>
              <Select onValueChange={setSelectedAgent} value={selectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm" variant="outline">
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave} size="sm">
            {entry ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { scopeToggleVariants };
