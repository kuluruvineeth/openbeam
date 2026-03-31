export type Connector = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
  documentCount: number;
};
