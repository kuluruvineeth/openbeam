"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type Person = {
  id: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
  avatarUrl?: string;
  connectorType?: string;
  documentCount?: number;
};

function PersonCard({ person }: { person: Person }) {
  return (
    <Link
      className="group flex items-center gap-4 border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/people/${person.id}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10 text-primary">
        {person.avatarUrl ? (
          <img
            alt={person.name}
            className="h-full w-full object-cover"
            src={person.avatarUrl}
          />
        ) : (
          <span className="font-medium text-lg">
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-0.5 truncate font-medium text-foreground group-hover:text-primary">
          {person.name}
        </h3>
        {person.title && (
          <p className="truncate text-muted-foreground text-sm">
            {person.title}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
          {person.department && <span>{person.department}</span>}
          {person.documentCount !== undefined && (
            <>
              <span>•</span>
              <span>{person.documentCount} docs</span>
            </>
          )}
        </div>
      </div>
      <Button
        className="opacity-0 group-hover:opacity-100"
        size="icon"
        variant="ghost"
      >
        <Icons.ArrowRight size={16} />
      </Button>
    </Link>
  );
}

function PersonSkeleton() {
  return (
    <div className="flex items-center gap-4 border border-border bg-background p-4">
      <Skeleton className="h-12 w-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery(
    trpc.people.list.queryOptions({
      query: search || undefined,
      department,
      excludeBots: true,
      limit: 50,
      offset: 0,
    })
  );

  const people = (data?.people || []) as Person[];
  const departments = [
    ...new Set(people.map((p) => p.department).filter(Boolean)),
  ];

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">People</h1>
          <p className="text-muted-foreground text-sm">
            Browse your organization's directory
          </p>
        </div>
        <Button
          onClick={() => router.push("/people/org-chart")}
          variant="outline"
        >
          <Icons.Workflow className="mr-2" size={16} />
          Org Chart
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Icons.Search
            className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
            size={18}
          />
          <Input
            className="h-10 pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            value={search}
          />
        </div>
        {departments.length > 0 && (
          <select
            className="h-10 border border-border bg-background px-3 text-sm"
            onChange={(e) => setDepartment(e.target.value || undefined)}
            value={department || ""}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* People Grid */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4">
          <PersonSkeleton />
          <PersonSkeleton />
          <PersonSkeleton />
          <PersonSkeleton />
          <PersonSkeleton />
          <PersonSkeleton />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
          <h3 className="mb-2 font-medium text-foreground">
            Failed to load people
          </h3>
          <p className="text-muted-foreground text-sm">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      {!(isLoading || error) && people.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.Agents className="mb-4 text-muted-foreground" size={32} />
          <h3 className="mb-2 font-medium text-foreground">No people found</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            {search
              ? "Try a different search term"
              : "People from your connected sources will appear here"}
          </p>
        </div>
      )}

      {!(isLoading || error) && people.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
