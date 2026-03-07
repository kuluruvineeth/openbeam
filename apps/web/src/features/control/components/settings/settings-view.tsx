"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@openbeam/ui";
import { AccessTab } from "./access-tab";
import { BudgetTab } from "./budget-tab";
import { SecretsTab } from "./secrets-tab";

export function SettingsView() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="font-semibold text-lg">Settings</h1>
        <p className="text-muted-foreground text-xs">
          Manage secrets, access, and budgets
        </p>
      </div>

      <Tabs defaultValue="secrets">
        <TabsList>
          <TabsTrigger value="secrets">Secrets</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="secrets">
          <SecretsTab />
        </TabsContent>

        <TabsContent className="mt-4" value="access">
          <AccessTab />
        </TabsContent>

        <TabsContent className="mt-4" value="budget">
          <BudgetTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
