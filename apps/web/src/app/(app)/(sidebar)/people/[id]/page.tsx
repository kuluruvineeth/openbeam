"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
  manager?: {
    id: string;
    name: string;
  };
  directReports?: Array<{
    id: string;
    name: string;
    title?: string;
  }>;
};

type PersonDocument = {
  id: string;
  title: string;
  documentType?: string;
  updatedAt?: number;
};

function DocumentRow({ document }: { document: PersonDocument }) {
  return (
    <Link
      className="group flex items-center gap-3 border-border border-b p-3 transition-colors last:border-b-0 hover:bg-accent/50"
      href={`/documents/${document.id}`}
    >
      <Icons.FileTextIcon
        className="shrink-0 text-muted-foreground"
        size={16}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground text-sm group-hover:text-primary">
          {document.title}
        </p>
      </div>
      {document.updatedAt && (
        <span className="shrink-0 text-muted-foreground text-xs">
          {new Date(document.updatedAt).toLocaleDateString()}
        </span>
      )}
    </Link>
  );
}

function TeamMemberCard({
  person,
  isManager = false,
}: {
  person: { id: string; name: string; title?: string };
  isManager?: boolean;
}) {
  return (
    <Link
      className="group flex items-center gap-3 border border-border bg-background p-3 transition-colors hover:border-primary/50"
      href={`/people/${person.id}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
        <span className="font-medium">
          {person.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground text-sm group-hover:text-primary">
          {person.name}
        </p>
        {person.title && (
          <p className="truncate text-muted-foreground text-xs">
            {person.title}
          </p>
        )}
      </div>
      {isManager && (
        <span className="shrink-0 bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          Manager
        </span>
      )}
    </Link>
  );
}

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();

  const personId = params.id as string;

  // Fetch person
  const {
    data: person,
    isLoading,
    error,
  } = useQuery(
    trpc.people.get.queryOptions({
      personId,
    })
  );

  // Fetch person's documents
  const { data: docsData } = useQuery(
    trpc.people.documents.queryOptions({
      personId,
      limit: 10,
      offset: 0,
    })
  );

  // Fetch org chart
  const { data: orgData } = useQuery(
    trpc.people.orgChart.queryOptions({
      personId,
    })
  );

  const personData = person as Person | undefined;
  const documents = (docsData?.documents || []) as PersonDocument[];

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">Person not found</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          This person may not exist or you don't have access
        </p>
        <Button onClick={() => router.push("/people")} variant="outline">
          Back to people
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-start gap-6">
        <Button
          onClick={() => router.push("/people")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>

        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-primary/10 text-primary">
              {personData?.avatarUrl ? (
                <img
                  alt={personData.name}
                  className="h-full w-full object-cover"
                  src={personData.avatarUrl}
                />
              ) : (
                <span className="font-medium text-3xl">
                  {personData?.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="mb-1 font-f37-stout text-2xl">
                {personData?.name}
              </h1>
              {personData?.title && (
                <p className="mb-1 text-lg text-muted-foreground">
                  {personData.title}
                </p>
              )}
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                {personData?.department && <span>{personData.department}</span>}
                {personData?.email && (
                  <>
                    <span>•</span>
                    <a
                      className="hover:text-primary"
                      href={`mailto:${personData.email}`}
                    >
                      {personData.email}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Recent Documents */}
          <section>
            <h2 className="mb-4 font-medium text-foreground">
              Recent Documents
            </h2>
            <div className="border border-border bg-background">
              {documents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No documents found
                </div>
              ) : (
                documents.map((doc) => (
                  <DocumentRow document={doc} key={doc.id} />
                ))
              )}
            </div>
            {documents.length > 0 && (
              <Button className="mt-4" variant="ghost">
                View all documents
                <Icons.ArrowRight className="ml-2" size={14} />
              </Button>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Team */}
          <section>
            <h2 className="mb-4 font-medium text-foreground">Team</h2>
            <div className="space-y-2">
              {personData?.manager && (
                <TeamMemberCard isManager person={personData.manager} />
              )}
              {personData?.directReports?.map((report) => (
                <TeamMemberCard key={report.id} person={report} />
              ))}
              {!(personData?.manager || personData?.directReports?.length) && (
                <p className="text-muted-foreground text-sm">
                  No team information available
                </p>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="mb-4 font-medium text-foreground">Quick Actions</h2>
            <div className="space-y-2">
              {personData?.email && (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <a href={`mailto:${personData.email}`}>
                    <Icons.Messages className="mr-2" size={16} />
                    Send email
                  </a>
                </Button>
              )}
              <Button className="w-full justify-start" variant="outline">
                <Icons.Search className="mr-2" size={16} />
                Search their docs
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
