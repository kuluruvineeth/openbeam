import type { OnboardingStep } from "../../prisma/generated/client";
import type { Database } from "../index";

export function createOnboardingState(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.onboardingState.upsert({
    where: { userId_teamId: { userId, teamId } },
    create: { userId, teamId, currentStep: "WELCOME", status: "IN_PROGRESS" },
    update: {},
  });
}

interface AdvanceStepOptions {
  userId: string;
  teamId: string;
  completedStep: OnboardingStep;
  nextStep: OnboardingStep;
  connectorId?: string;
}

export async function advanceOnboardingStep(
  db: Database,
  options: AdvanceStepOptions
) {
  const { userId, teamId, completedStep, nextStep, connectorId } = options;

  const state = await db.onboardingState.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!state || state.status !== "IN_PROGRESS") {
    return state;
  }

  const completedSteps = state.completedSteps.includes(completedStep)
    ? state.completedSteps
    : [...state.completedSteps, completedStep];

  return db.onboardingState.update({
    where: { userId_teamId: { userId, teamId } },
    data: {
      currentStep: nextStep,
      completedSteps,
      ...(connectorId && { connectorId }),
    },
  });
}

export function completeOnboarding(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.onboardingState.update({
    where: { userId_teamId: { userId, teamId } },
    data: {
      status: "COMPLETED",
      currentStep: "COMPLETED",
      completedSteps: {
        push: "COMPLETED",
      },
    },
  });
}

export function skipOnboarding(db: Database, userId: string, teamId: string) {
  return db.onboardingState.update({
    where: { userId_teamId: { userId, teamId } },
    data: { status: "SKIPPED" },
  });
}
