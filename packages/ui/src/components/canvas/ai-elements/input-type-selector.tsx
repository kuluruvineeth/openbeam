"use client";

import type { InputFieldType } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionButton } from "./selection-button";

const INPUT_TYPE_OPTIONS: {
  value: InputFieldType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "text", label: "Text", icon: <Icons.Type className="size-4" /> },
  {
    value: "textarea",
    label: "Long",
    icon: <Icons.AlignLeft className="size-4" />,
  },
  { value: "number", label: "Num", icon: <Icons.Hash className="size-4" /> },
  {
    value: "boolean",
    label: "Bool",
    icon: <Icons.ToggleLeft className="size-4" />,
  },
  {
    value: "date",
    label: "Date",
    icon: <Icons.Calendar className="size-4" />,
  },
  {
    value: "select",
    label: "Select",
    icon: <Icons.ChevronDown className="size-4" />,
  },
  {
    value: "multiselect",
    label: "Multi",
    icon: <Icons.List className="size-4" />,
  },
  { value: "email", label: "Email", icon: <Icons.Mail className="size-4" /> },
  { value: "url", label: "URL", icon: <Icons.Link className="size-4" /> },
  { value: "file", label: "File", icon: <Icons.Upload className="size-4" /> },
  {
    value: "password",
    label: "Pass",
    icon: <Icons.LockIcon className="size-4" />,
  },
  {
    value: "hidden",
    label: "Hide",
    icon: <Icons.EyeOff className="size-4" />,
  },
];

export interface InputTypeSelectorProps {
  value: InputFieldType;
  onChange: (type: InputFieldType) => void;
  disabled?: boolean;
  className?: string;
}

export const InputTypeSelector = memo(function InputTypeSelectorComponent({
  value,
  onChange,
  disabled,
  className,
}: InputTypeSelectorProps) {
  const handleSelect = useCallback(
    (type: InputFieldType) => {
      if (!disabled) {
        onChange(type);
      }
    },
    [onChange, disabled]
  );

  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {INPUT_TYPE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <SelectionButton
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 text-center",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => handleSelect(option.value)}
            selected={isSelected}
          >
            {option.icon}
            <span className="text-[10px] leading-none">{option.label}</span>
          </SelectionButton>
        );
      })}
    </div>
  );
});

InputTypeSelector.displayName = "InputTypeSelector";
