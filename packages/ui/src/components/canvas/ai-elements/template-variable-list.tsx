"use client";

import type { TemplateVariable } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Input } from "../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const VARIABLE_TYPES = [
  { id: "string", label: "String" },
  { id: "number", label: "Number" },
  { id: "boolean", label: "Boolean" },
  { id: "array", label: "Array" },
  { id: "object", label: "Object" },
  { id: "any", label: "Any" },
] as const;

interface TemplateVariableRowProps {
  variable: TemplateVariable;
  onChange: (variable: TemplateVariable) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const TemplateVariableRow = memo(function TemplateVariableRowComponent({
  variable,
  onChange,
  onRemove,
  canRemove,
}: TemplateVariableRowProps) {
  const handleNameChange = useCallback(
    (name: string) => {
      onChange({ ...variable, name });
    },
    [variable, onChange]
  );

  const handleTypeChange = useCallback(
    (type: TemplateVariable["type"]) => {
      onChange({ ...variable, type });
    },
    [variable, onChange]
  );

  const handleRequiredToggle = useCallback(() => {
    onChange({ ...variable, required: !variable.required });
  }, [variable, onChange]);

  return (
    <div className="group flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 p-2">
      <div className="flex-1">
        <Input
          className="h-7 font-mono text-xs"
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="variable_name"
          value={variable.name}
        />
      </div>
      <Select onValueChange={handleTypeChange} value={variable.type}>
        <SelectTrigger className="h-7 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VARIABLE_TYPES.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className={cn(
          "h-7 w-7",
          variable.required
            ? "border-primary/30 bg-primary/10 text-primary"
            : "text-muted-foreground"
        )}
        onClick={handleRequiredToggle}
        size="icon"
        title={variable.required ? "Required" : "Optional"}
        variant="outline"
      >
        {variable.required ? (
          <Icons.Sparkles className="size-3" />
        ) : (
          <Icons.Minus className="size-3" />
        )}
      </Button>
      {canRemove && (
        <Button
          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <Icons.XIcon className="size-3" />
        </Button>
      )}
      {variable.source === "detected" && (
        <Badge className="text-[10px]" variant="outline">
          auto
        </Badge>
      )}
    </div>
  );
});

TemplateVariableRow.displayName = "TemplateVariableRow";

export interface TemplateVariableListProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
  disabled?: boolean;
  className?: string;
}

export const TemplateVariableList = memo(
  function TemplateVariableListComponent({
    variables,
    onChange,
    disabled,
    className,
  }: TemplateVariableListProps) {
    const handleVariableChange = useCallback(
      (index: number, variable: TemplateVariable) => {
        const updated = [...variables];
        updated[index] = variable;
        onChange(updated);
      },
      [variables, onChange]
    );

    const handleRemove = useCallback(
      (index: number) => {
        onChange(variables.filter((_, i) => i !== index));
      },
      [variables, onChange]
    );

    const handleAdd = useCallback(() => {
      const newVariable: TemplateVariable = {
        id: `var_${Date.now().toString(36)}`,
        name: "",
        type: "string",
        required: true,
        source: "manual",
      };
      onChange([...variables, newVariable]);
    }, [variables, onChange]);

    return (
      <div className={cn("space-y-2", className)}>
        {variables.length === 0 ? (
          <div className="rounded-md border border-border/50 border-dashed py-6 text-center text-muted-foreground text-xs">
            No variables detected. Add manually or edit template.
          </div>
        ) : (
          <div className="space-y-2">
            {variables.map((variable, index) => (
              <TemplateVariableRow
                canRemove={variable.source === "manual"}
                key={variable.id}
                onChange={(v) => handleVariableChange(index, v)}
                onRemove={() => handleRemove(index)}
                variable={variable}
              />
            ))}
          </div>
        )}
        <Button
          className="w-full"
          disabled={disabled}
          onClick={handleAdd}
          size="sm"
          variant="outline"
        >
          <Icons.Plus className="mr-1.5 size-3.5" />
          Add Variable
        </Button>
      </div>
    );
  }
);

TemplateVariableList.displayName = "TemplateVariableList";
