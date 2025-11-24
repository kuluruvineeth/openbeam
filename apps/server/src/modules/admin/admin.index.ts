import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { setupBullBoard } from "./admin.handlers";

const admin = new OpenAPIHono<AuthEnv>();

// Apply auth middleware to all admin routes
// admin.use("/*", requireAuth);

// Admin email whitelist check middleware
// admin.use("/*", async (c, next) => {
//   const authContext = c.get("authContext");

//   if (!authContext || authContext.type === "none") {
//     return c.json(
//       {
//         error: "Unauthorized",
//         message: "Authentication required for admin access",
//       },
//       401
//     );
//   }

//   // Check if user is in admin whitelist
//   const adminEmails =
//     process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
//     [];

//   // Get email from auth context (only available for session auth)
//   let userEmail: string | undefined;
//   if (authContext.type === "session") {
//     userEmail = authContext.email;
//   }

//   // If no email or not in whitelist, deny access
//   if (!(userEmail && adminEmails.includes(userEmail.toLowerCase()))) {
//     return c.json(
//       {
//         error: "Forbidden",
//         message: "Admin access required. Contact your system administrator.",
//       },
//       403
//     );
//   }

//   await next();
// });

// Setup BullBoard and register routes
const serverAdapter = setupBullBoard();
admin.route("/queues", serverAdapter.registerPlugin());

export default admin;
