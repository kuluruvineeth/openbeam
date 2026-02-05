"use client";

import { type ReactNode, useState } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { Icons } from "../icons";

interface Step {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  isValid?: () => boolean;
}

interface StepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: Step[];
  onComplete: () => void | Promise<void>;
  isSubmitting?: boolean;
  completeLabel?: string;
}

function StepIndicator({
  index,
  currentStep,
  totalSteps,
}: {
  index: number;
  currentStep: number;
  totalSteps: number;
}) {
  const isCompleted = index < currentStep;
  const isCurrent = index === currentStep;

  return (
    <div className="flex items-center">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm transition-colors",
          isCompleted && "bg-primary text-primary-foreground",
          isCurrent && "bg-primary text-primary-foreground",
          !(isCompleted || isCurrent) && "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? <Icons.Check className="h-4 w-4" /> : index + 1}
      </div>
      {index < totalSteps - 1 && (
        <div
          className={cn(
            "mx-2 h-0.5 w-12",
            index < currentStep ? "bg-primary" : "bg-muted"
          )}
        />
      )}
    </div>
  );
}

function StepModal({
  open,
  onOpenChange,
  title,
  steps,
  onComplete,
  isSubmitting = false,
  completeLabel = "Create",
}: StepModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = steps[currentStep];
  const canGoNext = currentStepData?.isValid?.() ?? true;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      await onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center py-4">
          {steps.map((step, index) => (
            <StepIndicator
              currentStep={currentStep}
              index={index}
              key={step.id}
              totalSteps={steps.length}
            />
          ))}
        </div>

        <div className="min-h-[300px] py-4">
          {currentStepData && (
            <>
              <h3 className="mb-1 font-medium text-lg">
                {currentStepData.title}
              </h3>
              {currentStepData.description && (
                <p className="mb-4 text-muted-foreground text-sm">
                  {currentStepData.description}
                </p>
              )}
              {currentStepData.content}
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button
              disabled={currentStep === 0}
              onClick={handleBack}
              variant="outline"
            >
              <Icons.ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button disabled={!canGoNext || isSubmitting} onClick={handleNext}>
              {isLastStep ? (
                isSubmitting ? (
                  <>
                    <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  completeLabel
                )
              ) : (
                <>
                  Next
                  <Icons.ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { StepModal };
export type { Step, StepModalProps };
