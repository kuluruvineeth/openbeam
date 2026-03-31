import { formatRelativeTime } from "@openbeam/ui/utils/format";
import { ConnectorLogo } from "../../shared/connector-logo";

type SearchDoc = {
  id: string;
  title?: string | null;
  snippet?: string | null;
  source?: string | null;
  connectorType?: string | null;
  documentType?: string | null;
  sourceName?: string | null;
  url?: string | null;
  score?: number | null;
  updatedAt?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
};

function TypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ");
  return (
    <span className="font-mono text-[10px] text-foreground/40 uppercase tracking-wide">
      {label}
    </span>
  );
}

function Dot() {
  return <span className="text-foreground/20">·</span>;
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      <span
        className="block size-4 shrink-0 rounded-full bg-center bg-cover"
        role="img"
        style={{ backgroundImage: `url(${url})` }}
      />
    );
  }
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-[8px] text-foreground/50">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

type SearchResultRowProps = {
  doc: SearchDoc;
  onClick?: () => void;
};

export function SearchResultRow({ doc, onClick }: SearchResultRowProps) {
  const connectorType = doc.source ?? doc.connectorType ?? "";
  const docType = doc.documentType ?? "document";

  return (
    <button
      className="group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-foreground/3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10 focus-visible:ring-inset"
      onClick={onClick}
      type="button"
    >
      <div className="flex size-7 shrink-0 items-center justify-center bg-foreground/3">
        <ConnectorLogo size={16} type={connectorType} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <header className="flex items-center gap-2 font-mono text-[10px]">
          <TypeBadge type={docType} />
          {doc.sourceName && (
            <>
              <Dot />
              <span className="text-foreground/50">{doc.sourceName}</span>
            </>
          )}
          {doc.updatedAt && (
            <time className="ml-auto text-foreground/30 tabular-nums">
              {formatRelativeTime(doc.updatedAt)}
            </time>
          )}
        </header>

        {doc.title && (
          <p className="line-clamp-1 text-[13px] text-foreground/90 leading-snug">
            {doc.title}
          </p>
        )}

        {doc.authorName && (
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
            <Avatar name={doc.authorName} url={doc.authorAvatarUrl} />
            <span className="max-w-[120px] truncate">{doc.authorName}</span>
            {doc.updatedAt && (
              <>
                <Dot />
                <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
              </>
            )}
          </div>
        )}

        {doc.snippet && (
          <p className="line-clamp-2 text-[12px] text-foreground/50 leading-relaxed">
            {doc.snippet}
          </p>
        )}
      </div>
    </button>
  );
}
