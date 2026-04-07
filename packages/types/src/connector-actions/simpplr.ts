export interface SimpplrPageCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface SimpplrPageUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface SimpplrActionResults {
  page_create: SimpplrPageCreateResult;
  page_update: SimpplrPageUpdateResult;
}
