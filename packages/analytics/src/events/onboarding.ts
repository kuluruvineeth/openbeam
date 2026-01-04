import { getBrowserClient } from "../clients/browser";

export type OnboardingStep =
  | "signup_started"
  | "signup_completed"
  | "email_verified"
  | "profile_completed"
  | "team_created"
  | "team_joined"
  | "first_connector_started"
  | "first_connector_completed"
  | "first_search"
  | "first_ai_interaction"
  | "first_document_opened"
  | "first_share"
  | "teammate_invited"
  | "onboarding_completed";

const STEP_ORDER: Record<OnboardingStep, number> = {
  signup_started: 1,
  signup_completed: 2,
  email_verified: 3,
  profile_completed: 4,
  team_created: 5,
  team_joined: 5,
  first_connector_started: 6,
  first_connector_completed: 7,
  first_search: 8,
  first_ai_interaction: 9,
  first_document_opened: 10,
  first_share: 11,
  teammate_invited: 12,
  onboarding_completed: 13,
};

export interface OnboardingStepEvent {
  step: OnboardingStep;
  stepIndex: number;
  timeFromSignupMs: number;
  timeFromPreviousStepMs: number;
  metadata?: Record<string, unknown>;
}

export interface OnboardingCompletedEvent {
  totalTimeMs: number;
  stepsCompleted: OnboardingStep[];
  stepsSkipped: OnboardingStep[];
  connectorsSetup: string[];
  invitesSent: number;
  activationScore: number;
}

export interface OnboardingDropoffEvent {
  lastCompletedStep: OnboardingStep;
  dropoffStep: OnboardingStep;
  timeSpentOnStepMs: number;
  errorEncountered?: string;
}

const STORAGE_KEYS = {
  signupTime: "openplane_signup_time",
  lastStepTime: "openplane_last_step_time",
  completedSteps: "openplane_completed_steps",
} as const;

function getStorageValue(key: string): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

function setStorageValue(key: string, value: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(key, value);
}

export const onboardingEvents = {
  trackSignupStart: () => {
    const now = String(Date.now());
    setStorageValue(STORAGE_KEYS.signupTime, now);
    setStorageValue(STORAGE_KEYS.lastStepTime, now);
    setStorageValue(STORAGE_KEYS.completedSteps, JSON.stringify([]));
  },

  stepCompleted: (step: OnboardingStep, metadata?: Record<string, unknown>) => {
    const signupTime = getStorageValue(STORAGE_KEYS.signupTime);
    const lastStepTime = getStorageValue(STORAGE_KEYS.lastStepTime);
    const now = Date.now();

    const event: OnboardingStepEvent = {
      step,
      stepIndex: STEP_ORDER[step],
      timeFromSignupMs: signupTime ? now - Number.parseInt(signupTime, 10) : 0,
      timeFromPreviousStepMs: lastStepTime
        ? now - Number.parseInt(lastStepTime, 10)
        : 0,
      metadata,
    };

    setStorageValue(STORAGE_KEYS.lastStepTime, String(now));

    const completedStepsRaw = getStorageValue(STORAGE_KEYS.completedSteps);
    const completedSteps: OnboardingStep[] = completedStepsRaw
      ? JSON.parse(completedStepsRaw)
      : [];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
      setStorageValue(
        STORAGE_KEYS.completedSteps,
        JSON.stringify(completedSteps)
      );
    }

    getBrowserClient().capture("onboarding_step_completed", {
      ...event,
      $set: {
        onboarding_step: step,
        onboarding_step_index: event.stepIndex,
        [`onboarding_${step}_at`]: new Date().toISOString(),
      },
    });
  },

  dropoff: (event: OnboardingDropoffEvent) => {
    getBrowserClient().capture("onboarding_dropoff", event);
  },

  completed: (event: OnboardingCompletedEvent) => {
    getBrowserClient().capture("onboarding_completed", {
      ...event,
      $set: {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_activation_score: event.activationScore,
      },
    });

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.signupTime);
      localStorage.removeItem(STORAGE_KEYS.lastStepTime);
      localStorage.removeItem(STORAGE_KEYS.completedSteps);
    }
  },

  getCompletedSteps: (): OnboardingStep[] => {
    const completedStepsRaw = getStorageValue(STORAGE_KEYS.completedSteps);
    return completedStepsRaw ? JSON.parse(completedStepsRaw) : [];
  },
};
