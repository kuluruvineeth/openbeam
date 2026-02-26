export type ConnectionRole = "server" | "client";

export interface RelaySessionAttachment {
  serverId: string;
  role: ConnectionRole;
  version?: "1" | "2";
  clientId?: string | null;
  createdAt: number;
}
