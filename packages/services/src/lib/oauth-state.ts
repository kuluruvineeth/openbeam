import * as jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export type OAuthState = {
  userId: string;
  workspaceId: string;
  connectorId: string;
  redirectUrl?: string;
  timestamp: number;
};

export function createOAuthState(ctx: Omit<OAuthState, "timestamp">): string {
  return jwt.sign({ ...ctx, timestamp: Date.now() }, getSecret(), {
    expiresIn: "1h",
  });
}

export function verifyOAuthState(state: string): OAuthState {
  try {
    const payload = jwt.verify(state, getSecret());
    return payload as OAuthState;
  } catch {
    throw new Error("Invalid or expired OAuth state");
  }
}
