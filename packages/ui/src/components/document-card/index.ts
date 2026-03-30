import { DocumentCardRoot } from "./document-card";
import { DocumentCardActions } from "./document-card-actions";
import { DocumentCardContent } from "./document-card-content";
import { DocumentCardHeader } from "./document-card-header";
import { DocumentCardMetadata } from "./document-card-metadata";

const DocumentCard = Object.assign(DocumentCardRoot, {
  Header: DocumentCardHeader,
  Content: DocumentCardContent,
  Metadata: DocumentCardMetadata,
  Actions: DocumentCardActions,
});

export {
  DocumentCard,
  DocumentCardRoot,
  DocumentCardHeader,
  DocumentCardContent,
  DocumentCardMetadata,
  DocumentCardActions,
};
export type {
  DocumentCardActionsProps,
  DocumentCardContentProps,
  DocumentCardHeaderProps,
  DocumentCardMetadataProps,
  DocumentCardRootProps,
  DocumentCardVariant,
} from "./types";
