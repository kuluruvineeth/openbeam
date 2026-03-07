import type { VoiceRoomType } from "@openbeam/types/services/voice";

export function generateRoomName(
  teamId: string,
  userId: string,
  roomType: VoiceRoomType
) {
  return `${teamId}-${userId}-${roomType}-${Date.now()}`;
}

export async function generateLiveKitToken(
  userId: string,
  roomName: string
): Promise<{ token: string; wsUrl: string }> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_WS_URL;

  if (!(apiKey && apiSecret && wsUrl)) {
    throw new Error("LiveKit configuration missing");
  }

  const { AccessToken } = await import("livekit-server-sdk");
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: "1h",
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    wsUrl,
  };
}
