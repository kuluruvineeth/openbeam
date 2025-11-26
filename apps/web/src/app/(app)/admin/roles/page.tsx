"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  memberCount: number;
  isSystem: boolean;
};

const ROLES: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access to all features and settings",
    permissions: ["All permissions"],
    memberCount: 1,
    isSystem: true,
  },
  {
    id: "admin",
    name: "Admin",
    description: "Can manage team members and most settings",
    permissions: [
      "Manage members",
      "Manage connectors",
      "View analytics",
      "Manage collections",
    ],
    memberCount: 3,
    isSystem: true,
  },
  {
    id: "member",
    name: "Member",
    description: "Standard access to search and AI features",
    permissions: ["Search", "Use AI", "Create collections", "View documents"],
    memberCount: 20,
    isSystem: true,
  },
];

function RoleCard({ role }: { role: Role }) {
  return (
    <div className="border border-border bg-background p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-medium text-foreground text-lg">{role.name}</h3>
            {role.isSystem && (
              <span className="bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                System
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{role.description}</p>
        </div>
        <span className="text-muted-foreground text-sm">
          {role.memberCount} member{role.memberCount !== 1 && "s"}
        </span>
      </div>

      <div className="mb-4">
        <h4 className="mb-2 text-muted-foreground text-xs uppercase tracking-wider">
          Permissions
        </h4>
        <div className="flex flex-wrap gap-2">
          {role.permissions.map((permission) => (
            <span
              className="bg-primary/10 px-2 py-1 text-primary text-xs"
              key={permission}
            >
              {permission}
            </span>
          ))}
        </div>
      </div>

      {!role.isSystem && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Edit
          </Button>
          <Button size="sm" variant="ghost">
            <Icons.XIcon size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">
            Manage access levels and permissions
          </p>
        </div>
        <Button>
          <Icons.Plus className="mr-2" size={16} />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {ROLES.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 border border-border bg-muted/50 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-medium text-foreground text-sm">
          <Icons.Info size={16} />
          About Roles
        </h3>
        <p className="text-muted-foreground text-sm">
          System roles (Owner, Admin, Member) cannot be deleted but their
          permissions can be customized. Create custom roles for more granular
          access control.
        </p>
      </div>
    </div>
  );
}
