"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HotkeysProvider } from "react-hotkeys-hook";
import { JobProgressProvider } from "@/components/jobs/job-progress-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <HotkeysProvider>
        <TRPCReactProvider>
          <NuqsAdapter>
            <JobProgressProvider>{children}</JobProgressProvider>
          </NuqsAdapter>
        </TRPCReactProvider>
      </HotkeysProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
