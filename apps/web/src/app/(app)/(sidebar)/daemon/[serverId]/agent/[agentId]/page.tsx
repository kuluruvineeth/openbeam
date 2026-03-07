import type { Metadata } from "next";
import { AgentDetailScreen } from "@/features/daemon/components/agent-detail-screen";

export const metadata: Metadata = {
  title: "Agent | OpenBeam",
  description: "View and interact with an AI coding agent",
};

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ serverId: string; agentId: string }>;
}) {
  const { serverId, agentId } = await params;

  return <AgentDetailScreen agentId={agentId} serverId={serverId} />;
}
