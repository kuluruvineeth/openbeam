"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HotkeysProvider } from "react-hotkeys-hook";
import { JobProgressProvider } from "@/components/jobs";
import { TRPCReactProvider } from "@/trpc/client";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

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
