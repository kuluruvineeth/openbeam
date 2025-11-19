"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type AppSettingsItem = {
  id: string;
  label: string;
  description: string;
  type: "switch" | "text" | "password" | "select";
  required: boolean;
  options?: Array<{ label: string; value: string }>;
};

function AppSettingsItem({
  setting,
  disabled = false,
}: {
  setting: AppSettingsItem;
  disabled?: boolean;
}) {
  const form = useFormContext();

  // Subscribe to the value of this specific field
  // This ensures that when the user types, validation (and clearing of errors) happens
  useWatch({
    control: form.control,
    name: setting.id,
  });

  return (
    <FormField
      control={form.control}
      name={setting.id}
      render={({ field }) => (
        <FormItem
          className={
            setting.type === "switch"
              ? "flex flex-row items-center justify-between border p-4"
              : undefined
          }
        >
          <div className={setting.type === "switch" ? "space-y-0.5" : ""}>
            <FormLabel className="text-[#878787] text-base">
              {setting.label}
              {setting.required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
            {setting.type === "switch" && (
              <p className="text-[#878787] text-xs">{setting.description}</p>
            )}
          </div>

          <FormControl>
            {(() => {
              switch (setting.type) {
                case "switch":
                  return (
                    <Switch
                      checked={field.value}
                      disabled={disabled}
                      onCheckedChange={field.onChange}
                    />
                  );
                case "text":
                case "password":
                  return (
                    <div className="space-y-1">
                      <Input
                        {...field}
                        disabled={disabled}
                        placeholder={`Enter ${setting.label.toLowerCase()}...`}
                        type={setting.type === "password" ? "password" : "text"}
                        value={field.value || ""}
                      />
                      {/* Removing redundant check since we are in text/password case */}
                      <p className="text-[#878787] text-xs">
                        {setting.description}
                      </p>
                    </div>
                  );
                case "select":
                  return (
                    <div className="space-y-1">
                      <Select
                        disabled={disabled}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {setting.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[#878787] text-xs">
                        {setting.description}
                      </p>
                    </div>
                  );
                default:
                  return null;
              }
            })()}
          </FormControl>
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
    <div className="space-y-4">
      {settings.map((setting) => (
        <AppSettingsItem
          disabled={disabled}
          key={setting.id}
          setting={setting}
        />
      ))}
    </div>
  );
}
