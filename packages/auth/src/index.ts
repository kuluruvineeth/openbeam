import prisma from "@openplane/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3001";
const serverUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const isSecure = corsOrigin.startsWith("https://");
const needsProxy = isSecure && serverUrl.startsWith("http://");

// TODO: Later remove this hardcoded domain
// const cookieDomain = process.env.COOKIE_DOMAIN || ".openplane.tech";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

export const auth = betterAuth<BetterAuthOptions>({
  baseURL: needsProxy ? corsOrigin : serverUrl,
  basePath: "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [
    corsOrigin,
    serverUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean),
  advanced: {
    useSecureCookies: isSecure,
    defaultCookieAttributes: {
      secure: isSecure,
      httpOnly: true,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
      ...(cookieDomain && { domain: cookieDomain }),
    },
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
    cookiePrefix: "openplane-auth",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
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
