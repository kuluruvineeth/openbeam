"use client";

import type { UnifiedApp } from "@openplane/integrations";
import type { UseFormReturn } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { TabsContent } from "@/components/ui/tabs";
import { AppSettings } from "./app-settings";

type UnifiedAppSettingsTabProps = {
  app: UnifiedApp;
  // biome-ignore lint/suspicious/noExplicitAny: form control type is generic
  form: UseFormReturn<any>;
  isPending?: boolean;
};

export function UnifiedAppSettingsTab({
  app,
  form,
  isPending,
}: UnifiedAppSettingsTabProps) {
  // If no settings, don't render the tab content
  if (!app.settings || app.settings.length === 0) {
    return null;
  }

  return (
    <TabsContent className="pt-5" value="settings">
      <Form {...form}>
        <form className="space-y-5">
          <AppSettings
            disabled={isPending}
            settings={app.settings
              .filter((s) => s.enabled !== false)
              .map((s) => ({
                ...s,
                type:
                  s.id.includes("secret") ||
                  (s.id.includes("password") && s.type === "text")
                    ? "password"
                    : s.type,
              }))}
          />
          <p className="text-[11px] text-foreground/40">
            Changes apply after saving
          </p>
        </form>
      </Form>
    </TabsContent>
  );
}
