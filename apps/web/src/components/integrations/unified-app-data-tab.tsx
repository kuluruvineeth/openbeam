"use client";

import { AuthType, SyncMode, type UnifiedApp } from "@openplane/integrations";
import {
  Activity,
  Database,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

type UnifiedAppDataTabProps = {
  app: UnifiedApp;
};

export function UnifiedAppDataTab({ app }: UnifiedAppDataTabProps) {
  return (
    <TabsContent className="space-y-6 pt-4" value="data">
      <div className="border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-primary" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Data Synchronization</h3>
            <p className="text-[#878787] text-xs">
              This app syncs the following data types. Synchronization frequency
              varies by data type.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {app.streams?.map((stream) => (
          <Card className="overflow-hidden" key={stream.name}>
            <div className="border-border border-b bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {stream.entityType === "identity" && (
                    <Users className="h-4 w-4 text-[#878787]" />
                  )}
                  {stream.entityType === "resource" && (
                    <Database className="h-4 w-4 text-[#878787]" />
                  )}
                  {stream.entityType === "activity" && (
                    <Activity className="h-4 w-4 text-[#878787]" />
                  )}
                  <span className="font-medium text-sm">{stream.label}</span>
                </div>
                <Badge className="bg-background" variant="outline">
                  {stream.syncMode === SyncMode.REALTIME && (
                    <Zap className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-600" />
                  )}
                  {stream.syncMode === SyncMode.PERIODIC && (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  {stream.syncMode}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <p className="mb-3 text-[#878787] text-xs">
                {stream.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stream.dataPoints.map((point) => (
                  <Badge key={point} variant="secondary">
                    {point}
                  </Badge>
                ))}
              </div>
              {stream.isPii && (
                <div className="mt-3 flex items-center gap-1.5 text-amber-600 text-xs">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Contains Personally Identifiable Information</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {app.auth?.type === AuthType.OAUTH2 && app.auth.config.scopeDetails && (
        <div className="pt-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
            <Lock className="h-4 w-4" />
            Permissions
          </h3>
          <Accordion className="w-full" collapsible type="single">
            <AccordionItem value="scopes">
              <AccordionTrigger className="py-2 text-sm">
                View requested permissions
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pt-1">
                  {app.auth.config.scopeDetails.map((scope) => (
                    <li
                      className="flex flex-col gap-0.5 border border-border bg-muted/20 p-2"
                      key={scope.name}
                    >
                      <code className="font-mono text-[10px] text-primary">
                        {scope.name}
                      </code>
                      <span className="text-[#878787] text-xs">
                        {scope.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </TabsContent>
  );
}
