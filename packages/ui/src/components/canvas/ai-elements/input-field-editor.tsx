"use client";

import type {
  InputField,
  InputFieldOption,
  InputFieldType,
  InputFieldValidation,
} from "@openbeam/types/canvas";
import { memo, useCallback, useState } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Switch } from "../../switch";
import { ConfigField } from "../panels/config-field";
import { InputTypeSelector } from "./input-type-selector";

function generateFieldId(): string {
  return `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const TEXT_TYPES: InputFieldType[] = [
  "text",
  "textarea",
  "password",
  "email",
  "url",
];
const NUMBER_TYPES: InputFieldType[] = ["number"];
const PATTERN_TYPES: InputFieldType[] = ["text", "email", "url"];
const FILE_TYPES: InputFieldType[] = ["file"];
const OPTION_TYPES: InputFieldType[] = ["select", "multiselect"];

export interface InputFieldEditorProps {
  fields: InputField[];
  onChange: (fields: InputField[]) => void;
  disabled?: boolean;
  maxFields?: number;
}

export const InputFieldEditor = memo(function InputFieldEditorComponent({
  fields,
  onChange,
  disabled,
  maxFields = 20,
}: InputFieldEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    if (fields.length >= maxFields) {
      return;
    }
    const newField: InputField = {
      id: generateFieldId(),
      type: "text",
      label: `Field ${fields.length + 1}`,
      width: "full",
    };
    onChange([...fields, newField]);
    setExpandedId(newField.id);
  }, [fields, maxFields, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
      }
    },
    [fields, expandedId, onChange]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<InputField>) => {
      onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    },
    [fields, onChange]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const canAddMore = fields.length < maxFields;

  return (
    <div className="space-y-2">
      {fields.length > 0 ? (
        <div className="space-y-1">
          {fields.map((field) => {
            const isExpanded = expandedId === field.id;
            const isRequired = field.validation?.required ?? false;
            return (
              <div
                className="rounded-md border border-border/50 transition-colors hover:border-border"
                key={field.id}
              >
                <button
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                  onClick={() => handleToggleExpand(field.id)}
                  type="button"
                >
                  <Icons.GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {field.label}
                  </span>
                  <span className="shrink-0 rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {field.type}
                  </span>
                  {isRequired && (
                    <span className="shrink-0 text-destructive text-xs">*</span>
                  )}
                  <button
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(field.id);
                    }}
                    type="button"
                  >
                    <Icons.Close className="size-3.5" />
                  </button>
                </button>

                <AnimatedSizeContainer height>
                  {isExpanded && (
                    <FieldInlineEditor
                      disabled={disabled}
                      field={field}
                      onUpdate={(updates) => handleUpdate(field.id, updates)}
                    />
                  )}
                </AnimatedSizeContainer>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-border/50 border-dashed py-6 text-center">
          <div className="space-y-1">
            <Icons.Clipboard className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No fields added</p>
            <p className="text-muted-foreground/70 text-xs">
              Add fields to create a form
            </p>
          </div>
        </div>
      )}

      {canAddMore && (
        <Button
          className="w-full border-dashed"
          disabled={disabled}
          onClick={handleAdd}
          size="sm"
          variant="outline"
        >
          <Icons.Plus className="mr-1.5 size-3.5" />
          Add field
        </Button>
      )}
    </div>
  );
});

InputFieldEditor.displayName = "InputFieldEditor";

interface FieldInlineEditorProps {
  field: InputField;
  onUpdate: (updates: Partial<InputField>) => void;
  disabled?: boolean;
}

const FieldInlineEditor = memo(function FieldInlineEditorComponent({
  field,
  onUpdate,
  disabled,
}: FieldInlineEditorProps) {
  const validation = field.validation ?? ({} as Partial<InputFieldValidation>);

  const handleValidationChange = useCallback(
    (updates: Partial<InputFieldValidation>) => {
      onUpdate({
        validation: { ...validation, ...updates } as InputFieldValidation,
      });
    },
    [validation, onUpdate]
  );

  return (
    <div className="space-y-3 border-border/30 border-t px-2.5 pt-2 pb-3">
      <ConfigField label="Type">
        <InputTypeSelector
          disabled={disabled}
          onChange={(type) => onUpdate({ type })}
          value={field.type}
        />
      </ConfigField>

      <ConfigField label="Label" required>
        <Input
          className="h-8 text-xs"
          disabled={disabled}
          onChange={(e) => onUpdate({ label: e.target.value })}
          value={field.label}
        />
      </ConfigField>

      <ConfigField label="Placeholder">
        <Input
          className="h-8 text-xs"
          disabled={disabled}
          onChange={(e) =>
            onUpdate({ placeholder: e.target.value || undefined })
          }
          placeholder="Enter placeholder..."
          value={field.placeholder ?? ""}
        />
      </ConfigField>

      <ConfigField label="Helper Text">
        <Input
          className="h-8 text-xs"
          disabled={disabled}
          onChange={(e) =>
            onUpdate({ helperText: e.target.value || undefined })
          }
          placeholder="Help text shown below field"
          value={field.helperText ?? ""}
        />
      </ConfigField>

      <ConfigField horizontal label="Required">
        <Switch
          checked={validation.required ?? false}
          disabled={disabled}
          onCheckedChange={(required) => handleValidationChange({ required })}
        />
      </ConfigField>

      <FieldValidationSections
        disabled={disabled}
        fieldType={field.type}
        onValidationChange={handleValidationChange}
        validation={validation}
      />

      <AnimatedSizeContainer height>
        {OPTION_TYPES.includes(field.type) && (
          <OptionsEditor
            disabled={disabled}
            onChange={(options) => onUpdate({ options })}
            options={field.options ?? []}
          />
        )}
      </AnimatedSizeContainer>

      <ConfigField label="Custom Error">
        <Input
          className="h-8 text-xs"
          disabled={disabled}
          onChange={(e) =>
            handleValidationChange({
              customError: e.target.value || undefined,
            })
          }
          placeholder="Custom validation message"
          value={validation.customError ?? ""}
        />
      </ConfigField>
    </div>
  );
});

interface FieldValidationSectionsProps {
  fieldType: InputFieldType;
  validation: Partial<InputFieldValidation>;
  onValidationChange: (updates: Partial<InputFieldValidation>) => void;
  disabled?: boolean;
}

const FieldValidationSections = memo(function FieldValidationSectionsComponent({
  fieldType,
  validation,
  onValidationChange,
  disabled,
}: FieldValidationSectionsProps) {
  return (
    <>
      <AnimatedSizeContainer height>
        {TEXT_TYPES.includes(fieldType) && (
          <div className="space-y-3">
            <ConfigField label="Min Length">
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                min={0}
                onChange={(e) =>
                  onValidationChange({
                    minLength: Number.parseInt(e.target.value, 10) || undefined,
                  })
                }
                type="number"
                value={validation.minLength ?? ""}
              />
            </ConfigField>
            <ConfigField label="Max Length">
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                min={0}
                onChange={(e) =>
                  onValidationChange({
                    maxLength: Number.parseInt(e.target.value, 10) || undefined,
                  })
                }
                type="number"
                value={validation.maxLength ?? ""}
              />
            </ConfigField>
          </div>
        )}
      </AnimatedSizeContainer>

      <AnimatedSizeContainer height>
        {NUMBER_TYPES.includes(fieldType) && (
          <div className="space-y-3">
            <ConfigField label="Min">
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={(e) =>
                  onValidationChange({
                    min: Number.parseFloat(e.target.value) || undefined,
                  })
                }
                type="number"
                value={validation.min ?? ""}
              />
            </ConfigField>
            <ConfigField label="Max">
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={(e) =>
                  onValidationChange({
                    max: Number.parseFloat(e.target.value) || undefined,
                  })
                }
                type="number"
                value={validation.max ?? ""}
              />
            </ConfigField>
          </div>
        )}
      </AnimatedSizeContainer>

      <AnimatedSizeContainer height>
        {PATTERN_TYPES.includes(fieldType) && (
          <ConfigField label="Pattern (regex)">
            <Input
              className="h-8 font-mono text-xs"
              disabled={disabled}
              onChange={(e) =>
                onValidationChange({
                  pattern: e.target.value || undefined,
                })
              }
              placeholder="^[A-Za-z]+$"
              value={validation.pattern ?? ""}
            />
          </ConfigField>
        )}
      </AnimatedSizeContainer>

      <AnimatedSizeContainer height>
        {FILE_TYPES.includes(fieldType) && (
          <ConfigField label="Accepted Types">
            <Input
              className="h-8 text-xs"
              disabled={disabled}
              onChange={(e) =>
                onValidationChange({
                  accept: e.target.value || undefined,
                })
              }
              placeholder=".pdf,.docx,image/*"
              value={validation.accept ?? ""}
            />
          </ConfigField>
        )}
      </AnimatedSizeContainer>
    </>
  );
});

FieldInlineEditor.displayName = "FieldInlineEditor";

interface OptionsEditorProps {
  options: InputFieldOption[];
  onChange: (options: InputFieldOption[]) => void;
  disabled?: boolean;
}

const OptionsEditor = memo(function OptionsEditorComponent({
  options,
  onChange,
  disabled,
}: OptionsEditorProps) {
  const [draft, setDraft] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    onChange([
      ...options,
      { value: trimmed.toLowerCase().replace(/\s+/g, "_"), label: trimmed },
    ]);
    setDraft("");
  }, [draft, options, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(options.filter((_, i) => i !== index));
    },
    [options, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <ConfigField label="Options">
      <div className="space-y-1.5">
        {options.map((option, i) => (
          <div
            className="flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1.5"
            key={option.value}
          >
            <span className="min-w-0 flex-1 truncate text-xs">
              {option.label}
            </span>
            <button
              className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
              disabled={disabled}
              onClick={() => handleRemove(i)}
              type="button"
            >
              <Icons.Close className="size-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            className="h-8 flex-1 text-xs"
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Option label"
            value={draft}
          />
          <Button
            disabled={disabled || !draft.trim()}
            onClick={handleAdd}
            size="sm"
            variant="outline"
          >
            <Icons.Plus className="size-3.5" />
          </Button>
        </div>
      </div>
    </ConfigField>
  );
});

OptionsEditor.displayName = "OptionsEditor";
