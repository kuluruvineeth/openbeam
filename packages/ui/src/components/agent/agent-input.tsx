"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUp, Loader2, Paperclip, Square, X } from "lucide-react";
import { forwardRef, useCallback, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";

const agentInputVariants = cva(
  "relative flex flex-col rounded-lg border bg-background transition-colors focus-within:ring-1 focus-within:ring-ring",
  {
    variants: {
      size: {
        sm: "min-h-[80px]",
        md: "min-h-[100px]",
        lg: "min-h-[120px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

type AgentInputProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentInputVariants> & {
    placeholder?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    onSubmit?: (value: string, files?: AttachedFile[]) => void;
    onStop?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    showAttachments?: boolean;
    onAttach?: (files: FileList) => void;
    attachedFiles?: AttachedFile[];
    onRemoveFile?: (fileId: string) => void;
    maxLength?: number;
  };

const AgentInput = forwardRef<HTMLDivElement, AgentInputProps>(
  (
    {
      className,
      size,
      placeholder = "Ask anything...",
      value,
      onValueChange,
      onSubmit,
      onStop,
      isLoading = false,
      disabled = false,
      showAttachments = false,
      onAttach,
      attachedFiles = [],
      onRemoveFile,
      maxLength,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentValue = value ?? internalValue;
    const isControlled = value !== undefined;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        if (maxLength && newValue.length > maxLength) {
          return;
        }

        if (isControlled) {
          onValueChange?.(newValue);
        } else {
          setInternalValue(newValue);
        }
      },
      [isControlled, maxLength, onValueChange]
    );

    const handleSubmit = useCallback(() => {
      if (!currentValue.trim() || disabled || isLoading) {
        return;
      }

      onSubmit?.(
        currentValue,
        attachedFiles.length > 0 ? attachedFiles : undefined
      );

      if (!isControlled) {
        setInternalValue("");
      }
    }, [
      currentValue,
      disabled,
      isLoading,
      attachedFiles,
      onSubmit,
      isControlled,
    ]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          handleSubmit();
        }
      },
      [handleSubmit]
    );

    const handleAttachClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          onAttach?.(e.target.files);
          e.target.value = "";
        }
      },
      [onAttach]
    );

    return (
      <div
        className={cn(agentInputVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
            {attachedFiles.map((file) => (
              <div
                className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs"
                key={file.id}
              >
                <Paperclip className="size-3 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => onRemoveFile?.(file.id)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          className={cn(
            "flex-1 resize-none bg-transparent p-3 text-sm outline-none",
            "placeholder:text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          rows={3}
          value={currentValue}
        />

        <div className="flex items-center justify-between border-t px-2 py-1.5">
          <div className="flex items-center gap-1">
            {showAttachments && (
              <>
                <input
                  accept="*/*"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  className="size-7"
                  disabled={disabled || isLoading}
                  onClick={handleAttachClick}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Paperclip className="size-4" />
                </Button>
              </>
            )}
            {maxLength && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {currentValue.length}/{maxLength}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isLoading && onStop ? (
              <Button
                className="size-7"
                onClick={onStop}
                size="icon"
                type="button"
                variant="destructive"
              >
                <Square className="size-3 fill-current" />
              </Button>
            ) : (
              <Button
                className="size-7"
                disabled={!currentValue.trim() || disabled || isLoading}
                onClick={handleSubmit}
                size="icon"
                type="button"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
AgentInput.displayName = "AgentInput";

export { AgentInput, agentInputVariants };
export type { AgentInputProps, AttachedFile };
