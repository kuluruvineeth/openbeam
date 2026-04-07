import type { Database } from "@openbeam/db";
import { findBotUserLink, updateBotUserLinkActivity } from "@openbeam/db";
import type { UnifiedMessage } from "@openbeam/types/bot";

export interface ResolvedIdentity {
  teamId: string;
  userId: string;
}

export async function resolveIdentity(
  db: Database,
  message: UnifiedMessage
): Promise<ResolvedIdentity | null> {
  const link = await findBotUserLink(
    db,
    message.platform,
    message.platformUserId,
    message.platformTeamId
  );

  if (!link) {
    return null;
  }

  await updateBotUserLinkActivity(db, link.id);

  return { teamId: link.teamId, userId: link.userId };
}
