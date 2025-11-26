"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type Document = {
  id: string;
  title: string;
  content?: string;
  documentType?: string;
  connectorType?: string;
  url?: string;
  authorName?: string;
  authorId?: string;
  updatedAt?: number;
  createdAt?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

type SimilarDocument = {
  id: string;
  title: string;
  documentType?: string;
  score?: number;
};

function SimilarDocumentCard({ document }: { document: SimilarDocument }) {
  return (
    <a
      className="group flex items-center gap-3 border-border border-b p-3 transition-colors last:border-b-0 hover:bg-accent/50"
      href={`/documents/${document.id}`}
    >
      <Icons.FileTextIcon
        className="shrink-0 text-muted-foreground"
        size={16}
      />
      <span className="min-w-0 flex-1 truncate text-foreground text-sm group-hover:text-primary">
        {document.title}
      </span>
      {document.score && (
        <span className="shrink-0 text-muted-foreground text-xs">
          {Math.round(document.score * 100)}% match
        </span>
      )}
    </a>
  );
}

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const documentId = params.id as string;

  // Fetch document
  const {
    data: document,
    isLoading,
    error,
  } = useQuery(
    trpc.documents.get.queryOptions({
      documentId,
    })
  );

  // Fetch similar documents
  const { data: similarData } = useQuery(
    trpc.search.similar.queryOptions({
      documentId,
      limit: 5,
    })
  );

  // Create bookmark mutation
  const bookmarkMutation = useMutation(
    trpc.collections.createBookmark.mutationOptions({
      onSuccess: () => {
        toast.success("Document bookmarked");
      },
      onError: () => {
        toast.error("Failed to bookmark document");
      },
    })
  );

  const doc = document as Document | undefined;
  const similarDocs = (similarData?.documents || []) as SimilarDocument[];

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">Document not found</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          This document may have been deleted or you don't have access
        </p>
        <Button onClick={() => router.push("/documents")} variant="outline">
          Back to documents
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Button
          onClick={() => router.push("/documents")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <>
              <Skeleton className="mb-2 h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </>
          ) : (
            <>
              <h1 className="mb-2 font-f37-stout text-xl">
                {doc?.title || "Document"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                {doc?.connectorType && (
                  <span className="capitalize">{doc.connectorType}</span>
                )}
                {doc?.authorName && (
                  <>
                    <span>•</span>
                    <span>by {doc.authorName}</span>
                  </>
                )}
                {doc?.updatedAt && (
                  <>
                    <span>•</span>
                    <span>
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              bookmarkMutation.mutate({
                documentId,
                documentType: doc?.documentType,
              })
            }
            size="sm"
            variant="outline"
          >
            <Icons.CheckIcon className="mr-2" size={14} />
            Bookmark
          </Button>
          {doc?.url && (
            <Button asChild size="sm">
              <a href={doc.url} rel="noopener noreferrer" target="_blank">
                Open Original
                <Icons.ArrowRight className="ml-2" size={14} />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2">
          <div className="border border-border bg-background p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : doc?.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{doc.content}</p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Icons.FileIcon
                  className="mx-auto mb-4 text-muted-foreground"
                  size={32}
                />
                <p className="text-muted-foreground text-sm">
                  No content preview available
                </p>
                {doc?.url && (
                  <Button asChild className="mt-4" variant="outline">
                    <a href={doc.url} rel="noopener noreferrer" target="_blank">
                      Open in original app
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {doc?.tags && doc.tags.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 font-medium text-foreground text-sm">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span
                    className="bg-muted px-2 py-1 text-muted-foreground text-xs"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Document Info */}
          <div className="border border-border bg-background p-4">
            <h3 className="mb-3 font-medium text-foreground text-sm">
              Document Info
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-foreground capitalize">
                  {doc?.documentType || "Document"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-foreground capitalize">
                  {doc?.connectorType || "Unknown"}
                </dd>
              </div>
              {doc?.createdAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Similar Documents */}
          <div className="border border-border bg-background">
            <h3 className="border-border border-b p-4 font-medium text-foreground text-sm">
              Similar Documents
            </h3>
            {similarDocs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No similar documents found
              </div>
            ) : (
              similarDocs.map((similar) => (
                <SimilarDocumentCard document={similar} key={similar.id} />
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div className="border border-border bg-background p-4">
            <h3 className="mb-3 font-medium text-foreground text-sm">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="ghost">
                <Icons.Search className="mr-2" size={16} />
                Find related
              </Button>
              <Button className="w-full justify-start" variant="ghost">
                <Icons.KnowledgeManagement className="mr-2" size={16} />
                Add to collection
              </Button>
              <Button className="w-full justify-start" variant="ghost">
                <Icons.Messages className="mr-2" size={16} />
                Ask about this
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
