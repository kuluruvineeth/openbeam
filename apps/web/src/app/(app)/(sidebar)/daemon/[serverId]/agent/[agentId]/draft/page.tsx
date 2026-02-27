import type { Metadata } from "next";
import { DraftAgentScreen } from "@/features/daemon/components/draft-agent-screen";

export const metadata: Metadata = {
  title: "New Agent | OpenPlane",
  description: "Configure and launch a new AI coding agent",
};

export default async function DraftAgentPage({
  params,
}: {
  params: Promise<{ serverId: string; agentId: string }>;
}) {
  const { serverId } = await params;

  return <DraftAgentScreen serverId={serverId} />;
}
