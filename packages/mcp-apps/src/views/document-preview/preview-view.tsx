import { SourceIcon } from "../../shared/source-icon";
import type { DocumentRecord } from "./mock-data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground capitalize">
      {type}
    </span>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="shrink-0 text-muted-foreground text-xs">{label}</span>
      <span className="ml-4 truncate text-right text-xs">{value}</span>
    </div>
  );
}

function buildBreadcrumb(doc: DocumentRecord): string {
  const parts: string[] = [doc.connectorName];
  if (doc.documentType) {
    parts.push(doc.documentType);
  }
  return parts.join(" \u203A ");
}

interface PreviewViewProps {
  document: DocumentRecord;
}

export function PreviewView({ document: doc }: PreviewViewProps) {
  const metadata: Array<{ label: string; value: string }> = [];

  if (doc.author) {
    metadata.push({ label: "Author", value: doc.author });
  }
  if (doc.createdAt) {
    metadata.push({ label: "Created", value: formatDate(doc.createdAt) });
  }
  if (doc.updatedAt) {
    metadata.push({ label: "Updated", value: formatDate(doc.updatedAt) });
  }
  metadata.push({ label: "Source", value: doc.source });
  metadata.push({ label: "Connector", value: doc.connectorName });

  const midpoint = Math.ceil(metadata.length / 2);
  const leftCol = metadata.slice(0, midpoint);
  const rightCol = metadata.slice(midpoint);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SourceIcon size={24} type={doc.source} />
        {doc.documentType && <TypeBadge type={doc.documentType} />}
      </div>

      <div>
        <h1 className="font-semibold text-base leading-snug">{doc.title}</h1>
        <p className="mt-1 text-muted-foreground text-xs">
          {buildBreadcrumb(doc)}
        </p>
      </div>

      {doc.content && (
        <div className="line-clamp-5 rounded-sm bg-muted/30 p-3 text-muted-foreground text-sm leading-relaxed">
          {doc.content}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 border-border/50 border-t pt-2">
        <div>
          {leftCol.map((item) => (
            <MetadataRow
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </div>
        <div>
          {rightCol.map((item) => (
            <MetadataRow
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </div>
      </div>

      {doc.url && (
        <button
          className="flex h-8 w-full items-center justify-center rounded-sm border border-border/50 font-medium text-[13px] transition-colors hover:bg-muted/50"
          onClick={() => window.open(doc.url, "_blank", "noopener")}
          type="button"
        >
          Open in Source
        </button>
      )}
    </div>
  );
}
