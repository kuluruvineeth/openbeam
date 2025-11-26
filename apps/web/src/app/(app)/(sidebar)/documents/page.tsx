"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Document = {
  id: string;
  title: string;
  content?: string;
  documentType?: string;
  connectorType?: string;
  url?: string;
  authorName?: string;
  updatedAt?: number;
};

function DocumentCard({ document }: { document: Document }) {
  const getIcon = () => {
    switch (document.documentType) {
      case "spreadsheet":
        return <Icons.FileSpreadsheetIcon size={20} />;
      case "presentation":
        return <Icons.PresentationIcon size={20} />;
      case "image":
        return <Icons.FileImageIcon size={20} />;
      default:
        return <Icons.FileTextIcon size={20} />;
    }
  };

  return (
    <Link
      className="group flex flex-col border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/documents/${document.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center bg-muted text-muted-foreground">
          {getIcon()}
        </div>
        {document.connectorType && (
          <span className="bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
            {document.connectorType}
          </span>
        )}
      </div>
      <h3 className="mb-1 truncate font-medium text-foreground group-hover:text-primary">
        {document.title}
      </h3>
      {document.content && (
        <p className="mb-2 line-clamp-2 text-muted-foreground text-sm">
          {document.content}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 text-muted-foreground text-xs">
        {document.authorName && <span>by {document.authorName}</span>}
        {document.updatedAt && (
          <>
            <span>•</span>
            <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </Link>
  );
}

function DocumentSkeleton() {
  return (
    <div className="flex flex-col border border-border bg-background p-4">
      <Skeleton className="mb-3 h-10 w-10" />
      <Skeleton className="mb-2 h-5 w-2/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mt-auto h-3 w-1/3" />
    </div>
  );
}

const DOCUMENT_TYPES = [
  { label: "All", value: undefined },
  { label: "Documents", value: "document" },
  { label: "Spreadsheets", value: "spreadsheet" },
  { label: "Presentations", value: "presentation" },
  { label: "Messages", value: "message" },
];

export default function DocumentsPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery(
    trpc.documents.list.queryOptions({
      documentType: typeFilter,
      limit: 30,
      offset: 0,
    })
  );

  const documents = (data?.documents || []) as Document[];

  return (
    <div className="mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Browse all indexed documents from your connected sources
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Icons.Search
            className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
            size={18}
          />
          <Input
            className="h-10 pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            value={search}
          />
        </div>
        <div className="flex items-center gap-1">
          {DOCUMENT_TYPES.map((type) => (
            <button
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                typeFilter === type.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              key={type.label}
              onClick={() => setTypeFilter(type.value)}
              type="button"
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
          <h3 className="mb-2 font-medium text-foreground">
            Failed to load documents
          </h3>
          <p className="text-muted-foreground text-sm">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      {!(isLoading || error) && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.FileIcon className="mb-4 text-muted-foreground" size={32} />
          <h3 className="mb-2 font-medium text-foreground">No documents</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Documents from your connected sources will appear here
          </p>
          <Button onClick={() => (window.location.href = "/connectors")}>
            Connect a source
          </Button>
        </div>
      )}

      {!(isLoading || error) && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard document={doc} key={doc.id} />
          ))}
        </div>
      )}
    </div>
  );
}
