export type TeamInfo = {
  name: string;
  plan?: string;
  memberCount: number;
  connectorCount: number;
  documentCount: number;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

export const MOCK_TEAM: TeamInfo = {
  name: "Acme Engineering",
  plan: "Business",
  memberCount: 5,
  connectorCount: 12,
  documentCount: 84_320,
};

export const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "usr_01",
    name: "Sarah Chen",
    email: "sarah.chen@acme.dev",
    role: "admin",
    avatarUrl: "https://i.pravatar.cc/64?u=sarah.chen",
  },
  {
    id: "usr_02",
    name: "Marcus Rivera",
    email: "marcus.r@acme.dev",
    role: "member",
    avatarUrl: "https://i.pravatar.cc/64?u=marcus.rivera",
  },
  {
    id: "usr_03",
    name: "Priya Sharma",
    email: "priya.sharma@acme.dev",
    role: "member",
  },
  {
    id: "usr_04",
    name: "Alex Kim",
    email: "alex.kim@acme.dev",
    role: "admin",
    avatarUrl: "https://i.pravatar.cc/64?u=alex.kim",
  },
  {
    id: "usr_05",
    name: "Jordan Okafor",
    email: "jordan.o@acme.dev",
    role: "viewer",
  },
];
