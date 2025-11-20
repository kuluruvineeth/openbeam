import prisma from "@openplane/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { ADMIN, ac, MEMBER, OWNER } from "./permissions";

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
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          if (session.userId && !session.activeOrganizationId) {
            // 1. Check if user has a last active organization persisted
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { lastActiveOrganizationId: true },
            });

            let targetOrgId = user?.lastActiveOrganizationId;

            // 2. Verify the user is still a member of that organization
            if (targetOrgId) {
              const membership = await prisma.member.findFirst({
                where: {
                  userId: session.userId,
                  organizationId: targetOrgId,
                },
              });
              if (!membership) {
                targetOrgId = null;
              }
            }

            // 3. Fallback to the first organization they are a member of
            if (!targetOrgId) {
              const member = await prisma.member.findFirst({
                where: {
                  userId: session.userId,
                },
                orderBy: {
                  createdAt: "asc",
                },
              });
              targetOrgId = member?.organizationId;
            }

            // 4. Update the session if we found a valid organization
            if (targetOrgId) {
              await prisma.session.update({
                where: {
                  id: session.id,
                },
                data: {
                  activeOrganizationId: targetOrgId,
                },
              });
            }
          }
        },
      },
      update: {
        after: async (session) => {
          // When session is updated (e.g. active organization changes), persist it to the user profile
          if (session.userId && session.activeOrganizationId) {
            await prisma.user.update({
              where: { id: session.userId },
              data: {
                lastActiveOrganizationId: session.activeOrganizationId,
              },
            });
          }
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scope: ["openid", "profile", "email"],
    },
  },
  plugins: [
    organization({
      ac,
      roles: {
        OWNER,
        ADMIN,
        MEMBER,
      },
      creatorRole: "OWNER",
    }),
  ],
});

export type OrigamiUser = typeof auth.$Infer.Session.user;
export type OrigamiSession = typeof auth.$Infer.Session.session;
