import type { Database } from "../index";

export async function canUserExecuteCanvas(
  db: Database,
  userId: string,
  canvasId: string,
  teamId: string
): Promise<boolean> {
  const canvas = await db.agentCanvas.findFirst({
    where: { id: canvasId, teamId },
    select: { isPublic: true, createdById: true },
  });

  if (!canvas) {
    return false;
  }

  if (canvas.isPublic) {
    return true;
  }

  if (canvas.createdById === userId) {
    return true;
  }

  const membership = await db.usersOnTeam.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });

  if (membership?.role === "OWNER" || membership?.role === "ADMIN") {
    return true;
  }

  const permission = await db.agentCanvasPermission.findUnique({
    where: { canvasId_userId: { canvasId, userId } },
    select: { role: true },
  });

  if (!permission) {
    return false;
  }

  return (
    permission.role === "EXECUTOR" ||
    permission.role === "EDITOR" ||
    permission.role === "OWNER"
  );
}

export function getCanvasPermissions(db: Database, canvasId: string) {
  return db.agentCanvasPermission.findMany({
    where: { canvasId },
    include: {
      user: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function setCanvasPermission(
  db: Database,
  canvasId: string,
  userId: string,
  role: "VIEWER" | "EXECUTOR" | "EDITOR" | "OWNER"
) {
  return db.agentCanvasPermission.upsert({
    where: { canvasId_userId: { canvasId, userId } },
    create: { canvasId, userId, role },
    update: { role },
  });
}

export function removeCanvasPermission(
  db: Database,
  canvasId: string,
  userId: string
) {
  return db.agentCanvasPermission.deleteMany({
    where: { canvasId, userId },
  });
}
