"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../../utils/cn";
import { Input } from "../input";

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  isLoading?: boolean;
  className?: string;
  autoFocus?: boolean;
}

function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  isLoading,
  className,
  autoFocus,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  function renderRightIcon() {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    if (localValue) {
      return (
        <button
          className="rounded p-1 hover:bg-muted"
          onClick={handleClear}
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      );
    }

    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
      <Input
        autoFocus={autoFocus}
        className="pr-10 pl-10"
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        value={localValue}
      />
      <div className="-translate-y-1/2 absolute top-1/2 right-3">
        {renderRightIcon()}
      </div>
    </div>
  );
}

export { SearchInput };
export type { SearchInputProps };
