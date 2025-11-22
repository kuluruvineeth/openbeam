"use client";

import { Progress } from "@/components/ui/progress";

export function SyncProgressIndicator() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[#878787] text-xs">Syncing in progress...</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="animation-delay-0 h-1 w-1 animate-bounce rounded-full bg-blue-500" />
            <div className="animation-delay-200 h-1 w-1 animate-bounce rounded-full bg-blue-500" />
            <div className="animation-delay-400 h-1 w-1 animate-bounce rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
      <Progress className="h-1" value={undefined} />
    </div>
  );
}
