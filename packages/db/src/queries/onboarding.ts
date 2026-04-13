import type { Database } from "../index";

export function getOnboardingState(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.onboardingState.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
}

export function hasCompletedOnboarding(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.onboardingState
    .findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: { status: true },
    })
    .then((s) => s?.status === "COMPLETED" || s?.status === "SKIPPED");
}
