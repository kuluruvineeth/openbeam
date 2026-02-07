"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import { Input } from "../input";

interface InlineEditableProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  validate?: (value: string) => string | null;
}

function InlineEditable({
  value,
  onSave,
  placeholder = "Click to edit",
  className,
  inputClassName,
  validate,
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError(null);
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">
          <Input
            className={cn(error && "border-destructive", inputClassName)}
            disabled={isSaving}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            value={editValue}
          />
          {error && <p className="mt-1 text-destructive text-xs">{error}</p>}
        </div>
        <Button
          disabled={isSaving}
          onClick={handleSave}
          size="icon"
          variant="ghost"
        >
          <Icons.Check className="h-4 w-4" />
        </Button>
        <Button
          disabled={isSaving}
          onClick={handleCancel}
          size="icon"
          variant="ghost"
        >
          <Icons.X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      className={cn(
        "group flex items-center gap-2 text-left",
        "-mx-2 -my-1 rounded px-2 py-1 hover:bg-muted/50",
        "transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className={cn(!value && "text-muted-foreground")}>
        {value || placeholder}
      </span>
      <Icons.Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
    </button>
  );
}

export { InlineEditable };
export type { InlineEditableProps };
