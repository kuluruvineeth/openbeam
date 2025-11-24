import prisma from "@openplane/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const isDevelopment = process.env.NODE_ENV !== "production";

export const auth = betterAuth<BetterAuthOptions>({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.CORS_ORIGIN ||
    "http://localhost:3001",
  basePath: "/api/auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    process.env.CORS_ORIGIN || "",
    "https://new-sculpin-illegally.ngrok-free.app",
    "http://localhost:3001",
  ],
  advanced: {
    // For ngrok, we need secure cookies even in development
    useSecureCookies:
      !isDevelopment || Boolean(process.env.CORS_ORIGIN?.includes("ngrok")),
    defaultCookieAttributes: {
      // Use secure cookies for ngrok (HTTPS), regular for localhost (HTTP)
      secure:
        !isDevelopment || Boolean(process.env.CORS_ORIGIN?.includes("ngrok")),
      httpOnly: true,
      // Use "none" for ngrok to allow cross-site cookies, "lax" for localhost
      sameSite: (() => {
        if (process.env.CORS_ORIGIN?.includes("ngrok")) {
          return "none";
        }
        return isDevelopment ? "lax" : "none";
      })(),
      path: "/",
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: isDevelopment ? undefined : ".openplane.tech",
    },
    // Add cookie prefix for better organization
    cookiePrefix: "openplane-auth",
  },
  session: {
    // Cache the session in the cookie for 60 seconds
    // This is to avoid hitting the database for each request
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scope: ["openid", "profile", "email"],
    },
  },
});

export type OrigamiUser = typeof auth.$Infer.Session.user;
export type OrigamiSession = typeof auth.$Infer.Session.session;
