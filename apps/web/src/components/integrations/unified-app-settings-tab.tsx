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
  return (
    <TabsContent className="pt-4" value="settings">
      {app.settings && app.settings.length > 0 ? (
        <div className="space-y-6">
          <div className="border border-border bg-card p-4">
            <h3 className="mb-1 font-semibold text-sm">Configuration</h3>
            <p className="text-[#878787] text-xs">
              Manage settings for this integration. Changes are applied
              immediately.
            </p>
          </div>
          <Form {...form}>
            <form className="space-y-6">
              <AppSettings
                disabled={isPending}
                settings={app.settings.map((s) => ({
                  ...s,
                  type:
                    s.id.includes("secret") || s.id.includes("password")
                      ? "password"
                      : (s.type as "switch" | "text" | "select"),
                }))}
              />
            </form>
          </Form>
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center text-center text-[#878787]">
          <p>No settings available for this app.</p>
        </div>
      )}
    </TabsContent>
  );
}
