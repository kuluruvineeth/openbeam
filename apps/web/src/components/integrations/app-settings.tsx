"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  useFormContext,
  useWatch,
} from "@openbeam/ui";
import type { HTMLAttributes } from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

// biome-ignore lint/suspicious/noExplicitAny: value can be string, boolean, number
type Condition = { field: string; value: any };

type AppSettingsItem = {
  id: string;
  label: string;
  description: string;
  type:
    | "switch"
    | "text"
    | "password"
    | "select"
    | "number"
    | "file"
    | "textarea";
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  dependsOn?: Condition | Condition[];
  accept?: string;
  fileType?: "json" | "pem" | "any";
  rows?: number;
};

function FileUploadField({
  field,
  setting,
  disabled,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: form field type
  field: any;
  setting: AppSettingsItem;
  disabled: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) {
        return;
      }

      setError(null);

      try {
        const content = await file.text();

        if (setting.fileType === "json") {
          JSON.parse(content);
        }

        setFileName(file.name);
        field.onChange(content);
      } catch {
        setError("Invalid JSON format");
      }
    },
    [field, setting.fileType]
  );

  const onClear = useCallback(() => {
    setFileName(null);
    setError(null);
    field.onChange("");
  }, [field]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => setError("Invalid file type"),
    accept:
      setting.fileType === "json"
        ? { "application/json": [".json"] }
        : undefined,
    maxFiles: 1,
    disabled,
    noClick: Boolean(field.value),
    noDrag: Boolean(field.value),
  });

  const hasValue = Boolean(field.value);

  return (
    <div
      {...(getRootProps() as HTMLAttributes<HTMLDivElement>)}
      className={cn(
        "relative flex h-[100px] cursor-pointer flex-col items-center justify-center border border-dashed bg-background text-center transition-colors",
        isDragActive && "border-primary bg-primary/5",
        hasValue &&
          !error &&
          "cursor-default border-emerald-500/30 bg-emerald-500/5",
        error && "border-destructive",
        !(hasValue || isDragActive) && "hover:bg-foreground/5",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />

      {hasValue && !error ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground text-xs">{fileName}</p>
          <button
            className="text-foreground/40 text-xs transition-colors hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            type="button"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-foreground/50 text-xs">
          {isDragActive
            ? "Drop file here"
            : `Drop your ${setting.fileType === "json" ? "JSON" : ""} file here`}
        </p>
      )}

      {error && <p className="mt-2 text-destructive text-xs">{error}</p>}
    </div>
  );
}

function normalizeConditions(
  dependsOn: Condition | Condition[] | undefined
): Condition[] {
  if (!dependsOn) {
    return [];
  }
  if (Array.isArray(dependsOn)) {
    return dependsOn;
  }
  return [dependsOn];
}

function useConditionCheck(
  control: ReturnType<typeof useFormContext>["control"],
  dependsOn: Condition | Condition[] | undefined
) {
  const conditions = normalizeConditions(dependsOn);
  const fieldNames = conditions.map((c) => c.field);

  const values = useWatch({
    control,
    name: fieldNames.length > 0 ? fieldNames : ["_none_"],
  });

  if (conditions.length === 0) {
    return true;
  }

  return conditions.every((condition, index) => {
    const currentValue = values[index];
    return currentValue === condition.value;
  });
}

function SettingsField({
  setting,
  disabled = false,
}: {
  setting: AppSettingsItem;
  disabled?: boolean;
}) {
  const form = useFormContext();
  if (!form) {
    return null;
  }
  return <SettingsFieldInner disabled={disabled} setting={setting} />;
}

function SettingsFieldInner({
  setting,
  disabled = false,
}: {
  setting: AppSettingsItem;
  disabled?: boolean;
}) {
  const form = useFormContext();
  const [isFocused, setIsFocused] = useState(false);
  const shouldShow = useConditionCheck(form.control, setting.dependsOn);

  useWatch({ control: form.control, name: setting.id });

  if (!shouldShow) {
    return null;
  }

  const isDisabled =
    disabled ||
    (setting.id === "federated_channels" &&
      form.watch("federated_search_all_channels") === true);

  const showDescription = isFocused || setting.type === "switch";

  if (setting.type === "switch") {
    return (
      <FormField
        control={form.control}
        name={setting.id}
        render={({ field }) => (
          <FormItem className="flex items-center justify-between py-3">
            <div className="space-y-0.5 pr-4">
              <FormLabel className="text-sm">{setting.label}</FormLabel>
              <p className="text-foreground/50 text-xs">
                {setting.description}
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                disabled={isDisabled}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  if (setting.type === "file") {
    return (
      <FormField
        control={form.control}
        name={setting.id}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">
              {setting.label}
              {setting.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </FormLabel>
            <FormControl>
              <FileUploadField
                disabled={isDisabled}
                field={field}
                setting={setting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (setting.type === "textarea") {
    return (
      <FormField
        control={form.control}
        name={setting.id}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">
              {setting.label}
              {setting.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="font-mono text-xs"
                disabled={isDisabled}
                onBlur={() => setIsFocused(false)}
                onFocus={() => setIsFocused(true)}
                placeholder={setting.placeholder}
                rows={setting.rows || 4}
                value={field.value || ""}
              />
            </FormControl>
            <p
              className={cn(
                "overflow-hidden text-foreground/50 text-xs transition-all duration-200",
                showDescription
                  ? "mt-1.5 max-h-20 opacity-100"
                  : "max-h-0 opacity-0"
              )}
            >
              {setting.description}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (setting.type === "select") {
    return (
      <FormField
        control={form.control}
        name={setting.id}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">
              {setting.label}
              {setting.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </FormLabel>
            <FormControl>
              <Select
                disabled={isDisabled}
                onOpenChange={(open) => setIsFocused(open)}
                onValueChange={field.onChange}
                value={field.value || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {setting.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <p
              className={cn(
                "overflow-hidden text-foreground/50 text-xs transition-all duration-200",
                showDescription
                  ? "mt-1.5 max-h-20 opacity-100"
                  : "max-h-0 opacity-0"
              )}
            >
              {setting.description}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name={setting.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm">
            {setting.label}
            {setting.required && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              className={cn(
                setting.required && "ring-1 ring-border/0 focus:ring-primary/20"
              )}
              disabled={isDisabled}
              onBlur={() => setIsFocused(false)}
              onFocus={() => setIsFocused(true)}
              placeholder={setting.placeholder}
              type={setting.type === "password" ? "password" : "text"}
              value={field.value || ""}
            />
          </FormControl>
          <p
            className={cn(
              "overflow-hidden text-foreground/50 text-xs transition-all duration-200",
              showDescription
                ? "mt-1.5 max-h-20 opacity-100"
                : "max-h-0 opacity-0"
            )}
          >
            {setting.description}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AppSettings({
  settings,
  disabled = false,
}: {
  settings: AppSettingsItem[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      {settings.map((setting) => (
        <SettingsField disabled={disabled} key={setting.id} setting={setting} />
      ))}
    </div>
  );
}
