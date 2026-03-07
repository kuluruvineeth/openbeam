"use client";

import { Button, Textarea } from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  authorUserId?: string | null;
  authorAgentId?: string | null;
  createdAt: Date | string;
};

type CommentThreadProps = {
  comments: Comment[];
  onAddComment: (body: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
  className?: string;
};

export function CommentThread({
  comments,
  onAddComment,
  isSubmitting = false,
  placeholder = "Add a comment...",
  className,
}: CommentThreadProps) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    onAddComment(trimmed);
    setBody("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              className="rounded-sm border border-border/50 p-3"
              key={comment.id}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium text-xs">
                  {comment.authorAgentId ? "Agent" : "User"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-[60px] resize-none text-sm"
          disabled={isSubmitting}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={2}
          value={body}
        />
        <Button
          className="shrink-0 self-end"
          disabled={!body.trim() || isSubmitting}
          size="sm"
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
