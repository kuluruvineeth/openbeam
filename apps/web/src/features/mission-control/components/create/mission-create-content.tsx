"use client";

import { Button, Icons, ScrollArea } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCreateMission } from "../../hooks/use-create-mission";
import {
  useCanProceed,
  useCreationStep,
  useMissionCreationStore,
} from "../../stores/mission-creation-store";
import { ObjectiveStep } from "./objective-step";
import { ReviewStep } from "./review-step";
import { SquadStep } from "./squad-step";
import { TaskStep } from "./task-step";

const STEPS = [
  { label: "Objective", icon: Icons.FileText },
  { label: "Squad", icon: Icons.BotIcon },
  { label: "Tasks", icon: Icons.CheckCircle2 },
  { label: "Review", icon: Icons.Search },
] as const;

const stepIndicatorVariants = cva(
  "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-medium text-xs transition-colors",
  {
    variants: {
      state: {
        active: "bg-accent text-accent-foreground",
        completed: "text-primary",
        upcoming: "text-muted-foreground/50",
      },
    },
    defaultVariants: { state: "upcoming" },
  }
);

function resolveStepState(
  stepIndex: number,
  currentStep: number
): "active" | "completed" | "upcoming" {
  if (stepIndex === currentStep) {
    return "active";
  }
  if (stepIndex < currentStep) {
    return "completed";
  }
  return "upcoming";
}

function StepBody({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <ObjectiveStep />;
    case 1:
      return <SquadStep />;
    case 2:
      return <TaskStep />;
    case 3:
      return <ReviewStep />;
    default:
      return null;
  }
}

type MissionCreateContentProps = {
  onClose?: () => void;
};

export function MissionCreateContent({ onClose }: MissionCreateContentProps) {
  const step = useCreationStep();
  const canProceed = useCanProceed();
  const nextStep = useMissionCreationStore((s) => s.nextStep);
  const prevStep = useMissionCreationStore((s) => s.prevStep);
  const isSubmitting = useMissionCreationStore((s) => s.isSubmitting);
  const { mutate: launchMission } = useCreateMission(onClose);

  const isLastStep = step === 3;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-border/50 border-b px-4 py-2">
        {STEPS.map((s, index) => {
          const state = resolveStepState(index, step);
          const StepIcon = s.icon;
          return (
            <div className={stepIndicatorVariants({ state })} key={s.label}>
              {state === "completed" ? (
                <Icons.Check className="text-primary" size={14} />
              ) : (
                <StepIcon size={14} />
              )}
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-4 py-4">
        <StepBody step={step} />
      </ScrollArea>

      <div className="flex items-center justify-between border-border/50 border-t px-4 py-3">
        {step > 0 ? (
          <Button onClick={prevStep} size="sm" variant="ghost">
            <Icons.ArrowLeft size={14} />
            Back
          </Button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <Button
            disabled={isSubmitting}
            onClick={() => launchMission()}
            size="sm"
          >
            {isSubmitting ? (
              <Icons.Loader2 className="animate-spin" size={14} />
            ) : (
              <Icons.Play size={14} />
            )}
            Launch Mission
          </Button>
        ) : (
          <Button disabled={!canProceed} onClick={nextStep} size="sm">
            Next
            <Icons.ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

export { stepIndicatorVariants };
