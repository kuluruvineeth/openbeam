import { auth, type OrigamiSession, type OrigamiUser } from "@openplane/auth";
import { headers } from "next/headers";
import { cache } from "react";

export const getAuth = cache(
  async (): Promise<{
    user: OrigamiUser | null;
    session: OrigamiSession | null;
  }> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      return session ?? { user: null, session: null };
    } catch (error) {
      console.error("Error getting auth session", error);
      return { user: null, session: null };
    }
  }
);
