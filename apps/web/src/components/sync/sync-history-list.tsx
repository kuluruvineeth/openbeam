"use client";

import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SyncHistoryEntry } from "@/lib/sync-types";
import { SyncHistoryItem } from "./sync-history-item";

type SyncHistoryListProps = {
  history: SyncHistoryEntry[];
  isLoading: boolean;
};

export function SyncHistoryList({ history, isLoading }: SyncHistoryListProps) {
  if (isLoading) {
    return (
      <Card className="border bg-background">
        <CardHeader>
          <CardTitle className="font-medium text-sm">Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Icons.Loader2Icon
              className="animate-spin text-muted-foreground"
              size={20}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="border bg-background">
        <CardHeader>
          <CardTitle className="font-medium text-sm">Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icons.History className="mb-2 text-muted-foreground" size={32} />
            <p className="text-[#878787] text-sm">No sync history yet</p>
            <p className="text-[#878787] text-xs">
              Trigger a sync to see the history here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-background">
      <CardHeader>
        <CardTitle className="font-medium text-sm">Sync History</CardTitle>
        <CardDescription className="text-xs">
          Recent sync operations and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <SyncHistoryItem entry={entry} key={entry.id} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
