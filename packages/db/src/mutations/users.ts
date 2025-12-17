import type { Database } from "..";

export interface CreateUserInput {
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
}

export interface CreateUserResult {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  teamId: string | null;
}

export const createUser = async (
  db: Database,
  data: CreateUserInput
): Promise<CreateUserResult> =>
  db.user.create({
    data: {
      email: data.email,
      name: data.name,
      image: data.image,
      emailVerified: data.emailVerified,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      teamId: true,
    },
  });

export const updateUserImage = async (
  db: Database,
  userId: string,
  image: string
): Promise<void> => {
  await db.user.update({
    where: { id: userId },
    data: { image },
  });
};

export const getUserByEmail = async (
  db: Database,
  email: string
): Promise<CreateUserResult | null> =>
  db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      teamId: true,
    },
  });
