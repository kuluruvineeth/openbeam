"use client";

import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "active" | "pending" | "inactive";
  joinedAt: Date;
  avatarUrl?: string;
};

// Mock data
const MOCK_MEMBERS: Member[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "OWNER",
    status: "active",
    joinedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "ADMIN",
    status: "active",
    joinedAt: new Date("2024-02-20"),
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "MEMBER",
    status: "pending",
    joinedAt: new Date("2024-03-10"),
  },
];

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-4 border-border border-b p-4 last:border-b-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
        <span className="font-medium">
          {member.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{member.name}</p>
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
              member.role === "OWNER" && "bg-primary/10 text-primary",
              member.role === "ADMIN" && "bg-blue-500/10 text-blue-500",
              member.role === "MEMBER" && "bg-muted text-muted-foreground"
            )}
          >
            {member.role}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{member.email}</p>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "px-2 py-1 text-xs",
            member.status === "active" && "bg-green-500/10 text-green-500",
            member.status === "pending" && "bg-yellow-500/10 text-yellow-500",
            member.status === "inactive" && "bg-muted text-muted-foreground"
          )}
        >
          {member.status}
        </span>
        <span className="text-muted-foreground text-xs">
          Joined {member.joinedAt.toLocaleDateString()}
        </span>
        <Button size="icon" variant="ghost">
          <Icons.Settings size={16} />
        </Button>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();

  const filteredMembers = MOCK_MEMBERS.filter((member) => {
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Team Members</h1>
          <p className="text-muted-foreground text-sm">
            Manage your team's members and permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/members/invite">
            <Icons.Plus className="mr-2" size={16} />
            Invite Members
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Icons.Search
            className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
            size={18}
          />
          <Input
            className="h-10 pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            value={search}
          />
        </div>
        <div className="flex items-center gap-1">
          {[undefined, "OWNER", "ADMIN", "MEMBER"].map((role) => (
            <button
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                roleFilter === role
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              key={role || "all"}
              onClick={() => setRoleFilter(role)}
              type="button"
            >
              {role || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="border border-border bg-background">
        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.Agents className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              No members found
            </h3>
            <p className="text-muted-foreground text-sm">
              Try a different search term or filter
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))
        )}
      </div>
    </div>
  );
}
