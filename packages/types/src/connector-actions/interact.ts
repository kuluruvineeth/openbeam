export interface InteractPageCreateResult {
  id: string | undefined;
}

export interface InteractPageUpdateResult {
  id: string | undefined;
}

export interface InteractActionResults {
  page_create: InteractPageCreateResult;
  page_update: InteractPageUpdateResult;
}
