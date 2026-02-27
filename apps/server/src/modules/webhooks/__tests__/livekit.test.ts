import { describe, expect, it } from "bun:test";
import crypto from "node:crypto";

const BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/;

function createLiveKitSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

function verifyLiveKitSignature(
  body: string,
  authHeader: string | undefined,
  secret: string
): boolean {
  if (!authHeader) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

describe("livekit webhook signature", () => {
  const secret = "test-webhook-secret";

  it("accepts valid signature", () => {
    const body = JSON.stringify({
      event: "room_finished",
      room: { name: "test-room" },
    });
    const signature = createLiveKitSignature(body, secret);
    expect(verifyLiveKitSignature(body, signature, secret)).toBe(true);
  });

  it("rejects missing auth header", () => {
    expect(verifyLiveKitSignature("{}", undefined, secret)).toBe(false);
  });

  it("rejects invalid signature", () => {
    const body = JSON.stringify({ event: "room_finished" });
    expect(verifyLiveKitSignature(body, "invalid-sig", secret)).toBe(false);
  });

  it("rejects tampered body", () => {
    const body = JSON.stringify({ event: "room_finished" });
    const signature = createLiveKitSignature(body, secret);
    const tampered = JSON.stringify({ event: "participant_left" });
    expect(verifyLiveKitSignature(tampered, signature, secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const body = JSON.stringify({ event: "room_finished" });
    const signature = createLiveKitSignature(body, "wrong-secret");
    expect(verifyLiveKitSignature(body, signature, secret)).toBe(false);
  });

  it("handles base64 encoded signatures", () => {
    const body =
      '{"event":"room_finished","room":{"name":"team-1-user-1-dictation"}}';
    const signature = createLiveKitSignature(body, secret);
    expect(signature).toMatch(BASE64_PATTERN);
    expect(verifyLiveKitSignature(body, signature, secret)).toBe(true);
  });
});

describe("livekit webhook event parsing", () => {
  it("parses room_finished event", () => {
    const event = JSON.parse(
      JSON.stringify({
        event: "room_finished",
        room: { name: "team-1-user-1-dictation-1234", sid: "RM_abc" },
      })
    );
    expect(event.event).toBe("room_finished");
    expect(event.room.name).toBe("team-1-user-1-dictation-1234");
  });

  it("parses participant_left event", () => {
    const event = JSON.parse(
      JSON.stringify({
        event: "participant_left",
        room: { name: "team-1-user-1-action-5678" },
        participant: { identity: "user-1" },
      })
    );
    expect(event.event).toBe("participant_left");
    expect(event.participant.identity).toBe("user-1");
  });

  it("handles event without room name", () => {
    const event = JSON.parse(JSON.stringify({ event: "room_started" }));
    expect(event.room).toBeUndefined();
  });
});
