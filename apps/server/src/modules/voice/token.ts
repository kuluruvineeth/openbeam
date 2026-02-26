import type { VideoGrant } from "livekit-server-sdk";
import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";

type VoiceRoomType = "dictation" | "action" | "search";

export async function createVoiceToken(
  userId: string,
  teamId: string,
  roomType: VoiceRoomType
): Promise<string> {
  const roomName = `voice-${roomType}-${teamId}-${userId}`;

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: userId,
    ttl: "10m",
    metadata: JSON.stringify({ teamId, roomType }),
  });

  token.addGrant(grant);
  return await token.toJwt();
}
