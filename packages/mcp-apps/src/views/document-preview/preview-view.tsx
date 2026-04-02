import { DocumentCard } from "@openbeam/ui/components/document-card";
import { formatDate } from "@openbeam/ui/utils/format";
import { ConnectorLogo } from "../../shared/connector-logo";
import { EmptyState } from "../../shared/empty-state";
import type { DocumentRecord } from "./mock-data";

function buildMetadata(
  doc: DocumentRecord
): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];
  if (doc.author) {
    items.push({ label: "Author", value: doc.author });
  }
  if (doc.createdAt) {
    items.push({ label: "Created", value: formatDate(doc.createdAt) });
  }
  if (doc.updatedAt) {
    items.push({ label: "Updated", value: formatDate(doc.updatedAt) });
  }
  items.push({ label: "Source", value: doc.source });
  items.push({ label: "Connector", value: doc.connectorName });
  return items;
}

type PreviewViewProps = {
  document: DocumentRecord | null;
};

export function PreviewView({ document: doc }: PreviewViewProps) {
  if (!doc) {
    return (
      <EmptyState
        description="No document data"
        icon={
          <svg
            aria-hidden="true"
            className="text-muted-foreground/50"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        }
        title="Not found"
      />
    );
  }

  const breadcrumb = [doc.connectorName, doc.documentType]
    .filter(Boolean)
    .join(" \u203A ");

  return (
    <DocumentCard variant="compact">
      <DocumentCard.Header
        breadcrumb={breadcrumb}
        externalUrl={doc.url}
        icon={<ConnectorLogo size={24} type={doc.source} />}
        subtitle={doc.documentType}
        title={doc.title}
      />

      {doc.content && (
        <DocumentCard.Content maxLines={8}>{doc.content}</DocumentCard.Content>
      )}

      <DocumentCard.Metadata columns={2} items={buildMetadata(doc)} />

      {doc.url && (
        <DocumentCard.Actions>
          <button
            className="flex h-8 w-full items-center justify-center rounded-sm border border-border/50 font-medium text-xs transition-colors hover:bg-muted/50"
            onClick={() => window.open(doc.url, "_blank", "noopener")}
            type="button"
          >
            Open in Source
          </button>
        </DocumentCard.Actions>
      )}
    </DocumentCard>
  );
}
