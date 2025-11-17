import type { Database } from "..";

export const getUserById = async (db: Database, id: string) => {
  const result = await db.user.findUnique({
    where: { id },
  });
  return result;
};
