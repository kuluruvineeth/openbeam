export interface HarvestTimeEntryCreateResult {
  recordId: string | undefined;
}

export interface HarvestTimeEntryUpdateResult {
  recordId: string | undefined;
}

export interface HarvestTimerStopResult {
  recordId: string | undefined;
}

export interface HarvestTimerRestartResult {
  recordId: string | undefined;
}

export interface HarvestExpenseCreateResult {
  recordId: string | undefined;
}

export interface HarvestActionResults {
  time_entry_create: HarvestTimeEntryCreateResult;
  time_entry_update: HarvestTimeEntryUpdateResult;
  timer_stop: HarvestTimerStopResult;
  timer_restart: HarvestTimerRestartResult;
  expense_create: HarvestExpenseCreateResult;
}
