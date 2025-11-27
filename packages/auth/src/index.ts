import prisma from "@openplane/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Check if we're in a deployed environment (has BETTER_AUTH_URL set to a domain)
// const isDevelopment = process.env.NODE_ENV !== "production";
const isDeployed = Boolean(process.env.BETTER_AUTH_URL?.startsWith("https://"));

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
    // For deployed environments or ngrok, use secure cookies
    useSecureCookies:
      isDeployed || Boolean(process.env.CORS_ORIGIN?.includes("ngrok")),
    defaultCookieAttributes: {
      // Use secure cookies for deployed environments or ngrok
      secure: isDeployed || Boolean(process.env.CORS_ORIGIN?.includes("ngrok")),
      httpOnly: true,
      // Use "none" for cross-domain scenarios (deployed or ngrok), "lax" for localhost
      sameSite: (() => {
        if (isDeployed || process.env.CORS_ORIGIN?.includes("ngrok")) {
          return "none";
        }
        return "lax";
      })(),
      path: "/",
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: isDeployed ? ".openplane.tech" : undefined,
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
