import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  team: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
} as const;

export const ac = createAccessControl(statement);

export const OWNER = ac.newRole({
  team: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

export const ADMIN = ac.newRole({
  team: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

export const MEMBER = ac.newRole({
  team: [],
  member: [],
  invitation: [],
});
