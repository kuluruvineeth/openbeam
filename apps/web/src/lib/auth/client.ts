import type { auth } from "@openplane/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { baseUrl } from "../urls";

export const authClient = createAuthClient({
  baseURL: baseUrl,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut } = authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
