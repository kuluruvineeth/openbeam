import { getUserById } from "@openplane/db";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx: { prisma, session } }) =>
    getUserById(prisma, session.user.id)
  ),
});
