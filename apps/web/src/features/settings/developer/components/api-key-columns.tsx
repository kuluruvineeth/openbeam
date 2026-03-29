type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
};

type ApiKeyColumn = {
  id: keyof ApiKeyRow | "actions";
  header: string;
  className?: string;
};

const API_KEY_COLUMNS: ApiKeyColumn[] = [
  { id: "name", header: "Name" },
  { id: "prefix", header: "Key", className: "w-[180px]" },
  { id: "scopes", header: "Permissions", className: "w-[160px]" },
  { id: "createdAt", header: "Created", className: "w-[140px]" },
  { id: "lastUsedAt", header: "Last Used", className: "w-[140px]" },
  { id: "actions", header: "", className: "w-[48px]" },
];

export type { ApiKeyRow, ApiKeyColumn };
export { API_KEY_COLUMNS };
