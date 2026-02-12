"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { useMissionCreationStore } from "../stores/mission-creation-store";
import { MissionCreateContent } from "./create/mission-create-content";
import { MissionFormContext } from "./create/mission-form-context";

type MissionCreateSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MissionCreateSheet({
  isOpen,
  onClose,
}: MissionCreateSheetProps) {
  function handleOpenChange(open: boolean) {
    if (!open) {
      useMissionCreationStore.getState().reset();
      onClose();
    }
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="flex w-full max-w-2xl flex-col gap-0 overflow-hidden p-0"
        side="right"
      >
        <SheetHeader className="border-border/50 border-b px-4 py-3">
          <SheetTitle className="text-base">Create Mission</SheetTitle>
          <SheetDescription className="sr-only">
            Configure and launch a new mission
          </SheetDescription>
        </SheetHeader>

        <MissionFormContext>
          <MissionCreateContent onClose={onClose} />
        </MissionFormContext>
      </SheetContent>
    </Sheet>
  );
}
