"use client";

import type { InputField, InputNodeConfig } from "@openbeam/types/canvas";
import { Checkbox } from "@openbeam/ui/components/checkbox";
import { Input } from "@openbeam/ui/components/input";
import { Label } from "@openbeam/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openbeam/ui/components/select";
import { Switch } from "@openbeam/ui/components/switch";
import { Textarea } from "@openbeam/ui/components/textarea";
import { cn } from "@openbeam/ui/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export type ExecutionInputFormProps = {
  executionId: string;
  nodeId: string;
  config: InputNodeConfig;
};

function buildInitialValues(config: InputNodeConfig): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of config.fields) {
    if (field.defaultValue !== undefined) {
      values[field.id] = field.defaultValue;
      continue;
    }
    if (field.type === "boolean") {
      values[field.id] = false;
      continue;
    }
    if (field.type === "multiselect") {
      values[field.id] = [];
    }
  }

  return values;
}

function isBlankValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function formatDateInputValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function buildPayloadValues(
  config: InputNodeConfig,
  values: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (values[field.id] !== undefined) {
      payload[field.id] = values[field.id];
    }
  }
  return payload;
}

export function ExecutionInputForm({
  executionId,
  nodeId,
  config,
}: ExecutionInputFormProps) {
  "use no memo";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const initialValues = useMemo(() => buildInitialValues(config), [config]);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setAttemptedSubmit(false);
  }, [initialValues]);

  const requiredFieldIds = useMemo(
    () =>
      new Set(
        config.fields
          .filter((field) => field.validation?.required)
          .map((field) => field.id)
      ),
    [config.fields]
  );

  const missingRequired = useMemo(() => {
    const missing = new Set<string>();
    for (const fieldId of requiredFieldIds) {
      if (isBlankValue(values[fieldId])) {
        missing.add(fieldId);
      }
    }
    return missing;
  }, [requiredFieldIds, values]);

  const executionQueryKey = trpc.agentCanvas.getExecution.queryOptions({
    executionId,
  }).queryKey;

  const submitMutation = useMutation({
    ...trpc.agentCanvas.submitInput.mutationOptions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: executionQueryKey });
      const previousExecution = queryClient.getQueryData(executionQueryKey);
      return { previousExecution };
    },
    onSuccess: () => {
      toast.success("Input submitted");
    },
    onError: (error, _variables, context) => {
      if (context?.previousExecution !== undefined) {
        queryClient.setQueryData(executionQueryKey, context.previousExecution);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: executionQueryKey });
    },
  });

  const updateValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAttemptedSubmit(true);

      if (missingRequired.size > 0) {
        toast.error("Fill all required fields");
        return;
      }

      submitMutation.mutate({
        executionId,
        nodeId,
        values: buildPayloadValues(config, values),
      });
    },
    [config, executionId, missingRequired, nodeId, submitMutation, values]
  );

  const handleSkip = useCallback(() => {
    submitMutation.mutate({
      executionId,
      nodeId,
      skipped: true,
    });
  }, [executionId, nodeId, submitMutation]);

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys(
    "mod+enter",
    () => {
      formRef.current?.requestSubmit();
    },
    { enableOnFormTags: true }
  );

  const visibleFields = useMemo(
    () => config.fields.filter((field) => field.type !== "hidden"),
    [config.fields]
  );
  const isSubmitting = submitMutation.isPending;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
      {config.prompt ? (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {config.prompt}
        </p>
      ) : null}

      {visibleFields.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            visibleFields.length > 1 && "md:grid-cols-2"
          )}
        >
          {visibleFields.map((field) => (
            <ExecutionInputField
              disabled={isSubmitting}
              field={field}
              idPrefix={nodeId}
              invalid={attemptedSubmit && missingRequired.has(field.id)}
              key={field.id}
              onChange={(value) => updateValue(field.id, value)}
              value={values[field.id]}
            />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          No fields configured.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {config.allowSkip ? (
          <button
            className="h-8 rounded-sm px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleSkip}
            type="button"
          >
            {config.skipLabel || "Skip"}
          </button>
        ) : null}
        <button
          className="h-8 rounded-sm bg-foreground px-4 font-medium text-[13px] text-background transition-colors hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {config.submitLabel || "Submit"}
        </button>
      </div>
    </form>
  );
}

type ExecutionInputFieldProps = {
  field: InputField;
  value: unknown;
  onChange: (value: unknown) => void;
  invalid: boolean;
  disabled: boolean;
  idPrefix: string;
};

function ExecutionInputField({
  field,
  value,
  onChange,
  invalid,
  disabled,
  idPrefix,
}: ExecutionInputFieldProps) {
  const inputId = `${idPrefix}-${field.id}`;
  const required = field.validation?.required ?? false;
  const helperText =
    field.helperText ??
    (field.validation?.accept ? `Accepted: ${field.validation.accept}` : "");
  const fieldSpanClass =
    field.width === "half" ? "md:col-span-1" : "md:col-span-2";
  const stackClass = cn("space-y-1.5", fieldSpanClass);

  const label = (
    <Label
      className={cn(
        "text-[13px] text-muted-foreground",
        invalid && "text-destructive"
      )}
      htmlFor={inputId}
    >
      {field.label}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </Label>
  );

  const helper =
    helperText && helperText.trim().length > 0 ? (
      <p className="text-[11px] text-muted-foreground/70">{helperText}</p>
    ) : null;

  const error = invalid ? (
    <p className="text-[11px] text-destructive">Required</p>
  ) : null;

  if (field.type === "textarea") {
    return (
      <div className={stackClass}>
        {label}
        <Textarea
          aria-invalid={invalid || undefined}
          className={cn(
            "min-h-[72px] resize-none border-border/40 text-[13px] focus-visible:border-border focus-visible:ring-0",
            invalid && "border-destructive/60"
          )}
          disabled={disabled}
          id={inputId}
          maxLength={field.validation?.maxLength}
          minLength={field.validation?.minLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          value={typeof value === "string" ? value : ""}
        />
        {helper}
        {error}
      </div>
    );
  }

  if (field.type === "boolean") {
    const checked =
      value === true || value === "true" || value === 1 || value === "1";
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-sm border border-border/40 px-3 py-2.5",
          fieldSpanClass,
          invalid && "border-destructive/60"
        )}
      >
        <div className="space-y-0.5">
          <Label
            className={cn("text-[13px]", invalid && "text-destructive")}
            htmlFor={inputId}
          >
            {field.label}
            {required ? (
              <span className="ml-0.5 text-destructive">*</span>
            ) : null}
          </Label>
          {helper}
          {error}
        </div>
        <Switch
          checked={checked}
          disabled={disabled}
          id={inputId}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    return (
      <div className={stackClass}>
        {label}
        <Select
          disabled={disabled}
          onValueChange={onChange}
          value={typeof value === "string" ? value : ""}
        >
          <SelectTrigger
            aria-invalid={invalid || undefined}
            className={cn(
              "h-9 border-border/40 text-[13px] focus:border-border focus:ring-0",
              invalid && "border-destructive/60"
            )}
            id={inputId}
          >
            <SelectValue placeholder={field.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                className="text-[13px]"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {options.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">
            No options configured.
          </p>
        ) : null}
        {helper}
        {error}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const options = field.options ?? [];
    let selected: string[] = [];
    if (Array.isArray(value)) {
      selected = value.filter(
        (item): item is string => typeof item === "string"
      );
    } else if (typeof value === "string") {
      selected = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return (
      <div className={stackClass}>
        {label}
        <div
          className={cn(
            "space-y-1.5 rounded-sm border border-border/40 p-2.5",
            invalid && "border-destructive/60"
          )}
        >
          {options.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/70">
              No options configured.
            </p>
          ) : (
            options.map((option) => {
              const optionId = `${inputId}-${option.value}`;
              return (
                <div className="flex items-center gap-2" key={option.value}>
                  <Checkbox
                    checked={selected.includes(option.value)}
                    className="size-3.5"
                    disabled={disabled}
                    id={optionId}
                    onCheckedChange={(checked) => {
                      const next = new Set(selected);
                      if (checked === true) {
                        next.add(option.value);
                      } else {
                        next.delete(option.value);
                      }
                      onChange(Array.from(next));
                    }}
                  />
                  <Label className="text-[13px]" htmlFor={optionId}>
                    {option.label}
                  </Label>
                </div>
              );
            })
          )}
        </div>
        {helper}
        {error}
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className={stackClass}>
        {label}
        <Input
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 border-border/40 text-[13px] focus-visible:border-border focus-visible:ring-0",
            invalid && "border-destructive/60"
          )}
          disabled={disabled}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={formatDateInputValue(value)}
        />
        {helper}
        {error}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className={stackClass}>
        {label}
        <Input
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 border-border/40 text-[13px] tabular-nums focus-visible:border-border focus-visible:ring-0",
            invalid && "border-destructive/60"
          )}
          disabled={disabled}
          id={inputId}
          max={field.validation?.max}
          min={field.validation?.min}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          type="number"
          value={
            typeof value === "number" || typeof value === "string" ? value : ""
          }
        />
        {helper}
        {error}
      </div>
    );
  }

  let inputType: "text" | "email" | "url" | "password" = "text";
  if (field.type === "email") {
    inputType = "email";
  } else if (field.type === "url") {
    inputType = "url";
  } else if (field.type === "password") {
    inputType = "password";
  }

  return (
    <div className={stackClass}>
      {label}
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-9 border-border/40 text-[13px] focus-visible:border-border focus-visible:ring-0",
          invalid && "border-destructive/60"
        )}
        disabled={disabled}
        id={inputId}
        maxLength={field.validation?.maxLength}
        minLength={field.validation?.minLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        type={inputType}
        value={
          typeof value === "string" || typeof value === "number" ? value : ""
        }
      />
      {helper}
      {error}
    </div>
  );
}
