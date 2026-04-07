export interface GuruCardCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface GuruCardUpdateResult {
  id: string | undefined;
}

export interface GuruActionResults {
  card_create: GuruCardCreateResult;
  card_update: GuruCardUpdateResult;
}
