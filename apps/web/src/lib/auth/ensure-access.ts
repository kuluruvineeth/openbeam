import { redirect } from "next/navigation";
import { getAuth } from "./server";

export const ensureAccess = async () => {
  const { user } = await getAuth();

  if (!user) {
    redirect("/login");
  }
};
