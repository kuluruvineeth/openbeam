import type { Metadata } from "next";
import { AgentsScreen } from "@/features/daemon/components/agents-screen";

export const metadata: Metadata = {
  title: "Daemon | OpenBeam",
  description: "Monitor and control local AI coding agents",
};

export default async function DaemonPage({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;

  return <AgentsScreen serverId={serverId} />;
}
