import type { ReactNode } from "react";
import { DaemonConnectionProvider } from "@/features/daemon/components/daemon-connection-provider";
import { DaemonLayout } from "@/features/daemon/components/daemon-layout";

export default function DaemonServerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DaemonConnectionProvider>
      <DaemonLayout>{children}</DaemonLayout>
    </DaemonConnectionProvider>
  );
}
