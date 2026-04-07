export interface Dynamics365AccountCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365AccountUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365ContactCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365ContactUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365OpportunityCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365OpportunityUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface Dynamics365ActionResults {
  account_create: Dynamics365AccountCreateResult;
  account_update: Dynamics365AccountUpdateResult;
  contact_create: Dynamics365ContactCreateResult;
  contact_update: Dynamics365ContactUpdateResult;
  opportunity_create: Dynamics365OpportunityCreateResult;
  opportunity_update: Dynamics365OpportunityUpdateResult;
}
