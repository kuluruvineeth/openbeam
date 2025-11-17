"use client";

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
      <TRPCReactProvider>{children}</TRPCReactProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
