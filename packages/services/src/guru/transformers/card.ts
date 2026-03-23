import type { GuruTransformContext } from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { stripHtml } from "./utils";

export interface GuruCard {
  id: string;
  preferredPhrase: string;
  content: string;
  htmlContent?: boolean;
  slug?: string;
  shareStatus?: string;
  verificationState?: string;
  verificationInterval?: number;
  dateCreated?: string;
  lastModified?: string;
  lastModifiedBy?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  owner?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  collection?: {
    id: string;
    name: string;
    color?: string;
  };
  boards?: {
    id: string;
    title?: string;
  }[];
  tags?: {
    id: string;
    value: string;
    categoryName?: string;
    categoryId?: string;
  }[];
  verifiers?: {
    id: string;
    email?: string;
    type?: string;
  }[];
  cardType?: string;
}

function buildCardContent(card: GuruCard): string {
  const parts: string[] = [];

  const textContent =
    card.htmlContent !== false ? stripHtml(card.content) : card.content;

  if (textContent) {
    parts.push(textContent);
  }

  if (card.collection) {
    parts.push(`Collection: ${card.collection.name}`);
  }

  if (card.verificationState) {
    parts.push(`Verification: ${card.verificationState}`);
  }

  if (card.tags?.length) {
    parts.push(`Tags: ${card.tags.map((t) => t.value).join(", ")}`);
  }

  if (card.boards?.length) {
    const boardNames = card.boards
      .map((b) => b.title)
      .filter(Boolean)
      .join(", ");
    if (boardNames) {
      parts.push(`Boards: ${boardNames}`);
    }
  }

  return parts.join("\n");
}

function buildCardMetadata(card: GuruCard): GenericDocument["metadata"] {
  return {
    cardId: card.id,
    ...(card.collection && {
      collectionId: card.collection.id,
      collectionName: card.collection.name,
    }),
    ...(card.verificationState && {
      verificationState: card.verificationState,
    }),
    ...(card.shareStatus && { shareStatus: card.shareStatus }),
    ...(card.cardType && { cardType: card.cardType }),
    ...(card.tags?.length && {
      tags: card.tags.map((t) => t.value).join(", "),
    }),
    ...(card.boards?.length && {
      boards: card.boards
        .map((b) => b.title)
        .filter(Boolean)
        .join(", "),
    }),
    ...(card.slug && { slug: card.slug }),
  };
}

function formatOwnerName(user?: GuruCard["owner"]): string | undefined {
  if (!user) {
    return;
  }
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export async function transformCard(
  card: GuruCard,
  context: GuruTransformContext
): Promise<GenericDocument> {
  const title = card.preferredPhrase;
  const content = buildCardContent(card);
  const metadata = buildCardMetadata(card);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = card.dateCreated
    ? new Date(card.dateCreated).getTime()
    : Date.now();
  const updatedAt = card.lastModified
    ? new Date(card.lastModified).getTime()
    : createdAt;

  const cardUrl = card.slug
    ? `https://app.getguru.com/card/${card.slug}`
    : `https://app.getguru.com/card/${card.id}`;

  return {
    id: `${context.connectorId}_card_${card.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: card.id,
    document_type: "card",
    document_subtype: card.verificationState ?? "unverified",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "guru",
    url: cardUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: formatOwnerName(card.owner),
    author_email: card.owner?.email,
    author_id: card.owner?.id,
  };
}
