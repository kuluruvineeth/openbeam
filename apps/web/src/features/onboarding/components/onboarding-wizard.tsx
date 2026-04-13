"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOnboarding } from "../hooks/use-onboarding";
import { ConnectStep } from "./steps/connect-step";
import { FirstSearchStep } from "./steps/first-search-step";
import { SyncStep } from "./steps/sync-step";
import { WelcomeStep } from "./steps/welcome-step";

const STEP_COMPONENTS = {
  WELCOME: WelcomeStep,
  CONNECT_SOURCE: ConnectStep,
  SYNC_PROGRESS: SyncStep,
  FIRST_SEARCH: FirstSearchStep,
} as const;

export function OnboardingWizard() {
  const router = useRouter();
  const { state, needsOnboarding, isLoading, initialize, advance, skip } =
    useOnboarding();

  useEffect(() => {
    if (!isLoading && needsOnboarding && !state) {
      initialize({});
    }
  }, [isLoading, needsOnboarding, state, initialize]);

  useEffect(() => {
    if (state?.status === "COMPLETED" || state?.status === "SKIPPED") {
      router.push("/");
    }
  }, [state?.status, router]);

  if (isLoading || !state) {
    return <WizardSkeleton />;
  }

  const currentStep = state.currentStep;

  if (currentStep === "COMPLETED") {
    return null;
  }

  const StepComponent =
    STEP_COMPONENTS[currentStep as keyof typeof STEP_COMPONENTS];

  if (!StepComponent) {
    return null;
  }

  const stepIndex = Object.keys(STEP_COMPONENTS).indexOf(currentStep);
  const totalSteps = Object.keys(STEP_COMPONENTS).length;

  return (
    <div className="space-y-6">
      <StepProgress current={stepIndex} total={totalSteps} />
      <StepComponent
        onAdvance={(connectorId) => advance({ connectorId })}
        onSkip={() => skip({})}
      />
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          className={`h-1 flex-1 rounded-sm transition-colors ${
            i <= current ? "bg-foreground" : "bg-foreground/10"
          }`}
          key={`step-${i}`}
        />
      ))}
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            className="h-1 flex-1 animate-pulse rounded-sm bg-foreground/10"
            key={`skel-${i}`}
          />
        ))}
      </div>
      <div className="space-y-4 py-8">
        <div className="h-6 w-48 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-sm bg-muted" />
      </div>
    </div>
  );
}
