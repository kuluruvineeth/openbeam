"use client";

import {
  EmailDateSeparator,
  EmailMessageItem,
} from "@/components/email-preview/email-message-item";
import type { EmailAttachment, EmailMessage } from "@/lib/email-types";
import { formatMessageDate } from "@/lib/message-format";

type EmailThreadViewProps = {
  messages: EmailMessage[];
  onAttachmentClick?: (attachment: EmailAttachment) => void;
};

function groupMessagesByDate(
  messages: EmailMessage[]
): Map<string, EmailMessage[]> {
  const groups = new Map<string, EmailMessage[]>();

  for (const message of messages) {
    const dateKey = formatMessageDate(message.createdAt);
    const existing = groups.get(dateKey) ?? [];
    existing.push(message);
    groups.set(dateKey, existing);
  }

  return groups;
}

export function EmailThreadView({
  messages,
  onAttachmentClick,
}: EmailThreadViewProps) {
  const groupedMessages = groupMessagesByDate(messages);
  const dateKeys = Array.from(groupedMessages.keys());

  return (
    <article aria-label="Email thread" className="space-y-4 p-4">
      {dateKeys.map((dateKey, dateIndex) => {
        const dateMessages = groupedMessages.get(dateKey) ?? [];
        return (
          <section key={dateKey}>
            {dateIndex > 0 && (
              <EmailDateSeparator timestamp={dateMessages[0]?.createdAt ?? 0} />
            )}
            <ol aria-label="Messages" className="list-none space-y-4">
              {dateMessages.map((message, msgIndex) => {
                const globalIndex =
                  dateKeys
                    .slice(0, dateIndex)
                    .reduce(
                      (acc, key) =>
                        acc + (groupedMessages.get(key)?.length ?? 0),
                      0
                    ) + msgIndex;
                const isFirst = globalIndex === 0;
                const isLast = globalIndex === messages.length - 1;

                return (
                  <li key={message.id}>
                    <EmailMessageItem
                      defaultExpanded={isFirst || isLast}
                      isFirst={isFirst}
                      isLast={isLast}
                      message={message}
                      onAttachmentClick={onAttachmentClick}
                    />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </article>
  );
}
