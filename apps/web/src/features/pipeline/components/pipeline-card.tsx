"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge, cn, Icons } from "@openplane/ui";
import { cva, type VariantProps } from "class-variance-authority";
import { MAX_CARD_FIELDS_DISPLAYED } from "../constants";
import type { PipelineCard as PipelineCardType } from "../types";

const cardVariants = cva(
  "cursor-grab select-none rounded-md border p-3 transition-all duration-100 active:cursor-grabbing",
  {
    variants: {
      state: {
        default: "border-border/50 bg-background hover:border-border",
        dragging: "border-primary/50 bg-background opacity-40",
        focused: "border-primary bg-primary/5",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

type PipelineCardProps = {
  card: PipelineCardType;
  isFocused?: boolean;
  onCardClick?: (cardId: string) => void;
  className?: string;
};

export function PipelineCardDraggable({
  card,
  isFocused,
  onCardClick,
  className,
}: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  let state: VariantProps<typeof cardVariants>["state"] = "default";
  if (isDragging) {
    state = "dragging";
  } else if (isFocused) {
    state = "focused";
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(cardVariants({ state }), "text-left", className)}
      onClick={(e) => {
        if (!isDragging && onCardClick) {
          e.stopPropagation();
          onCardClick(card.id);
        }
      }}
      type="button"
    >
      <PipelineCardContent card={card} />
    </button>
  );
}

type PipelineCardContentProps = {
  card: PipelineCardType;
};

export function PipelineCardContent({ card }: PipelineCardContentProps) {
  const visibleFields = card.fields.slice(0, MAX_CARD_FIELDS_DISPLAYED);

  return (
    <>
      <div className="mb-1.5 truncate font-medium text-sm">{card.title}</div>

      {visibleFields.length > 0 && (
        <div className="space-y-1">
          {visibleFields.map((field) => (
            <div className="flex items-center gap-1.5 text-xs" key={field.name}>
              <span className="text-muted-foreground">{field.name}:</span>
              <FieldValue type={field.type} value={field.value} />
            </div>
          ))}
        </div>
      )}

      {card.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map((tag) => (
            <Badge className="text-[10px]" key={tag} variant="tag">
              {tag}
            </Badge>
          ))}
          {card.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{card.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {card.assigneeName && (
        <div className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
          <Icons.User size={12} />
          <span className="truncate">{card.assigneeName}</span>
        </div>
      )}
    </>
  );
}

function FieldValue({ type, value }: { type: string; value: string }) {
  if (type === "enum") {
    return (
      <Badge className="text-[10px]" variant="tag">
        {value}
      </Badge>
    );
  }

  if (type === "url") {
    return (
      <span className="flex items-center gap-0.5 truncate text-primary">
        <Icons.ExternalLink size={10} />
        {value}
      </span>
    );
  }

  if (type === "relation") {
    return (
      <span className="flex items-center gap-0.5 truncate text-primary">
        <Icons.Link size={10} />
        {value}
      </span>
    );
  }

  return <span className="truncate">{value}</span>;
}
