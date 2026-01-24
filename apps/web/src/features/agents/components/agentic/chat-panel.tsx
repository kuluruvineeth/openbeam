"use client";

import {
  AgentMessageList,
  ModelSelect,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputEditor,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputText,
} from "@openplane/ui";
import { cn } from "@openplane/ui/utils";
import { useCallback, useEffect, useState } from "react";
import { useCanvasBuilder } from "../../hooks";
import { ChatGreeting } from "./chat-greeting";

interface ChatPanelProps {
  agentId: string;
  className?: string;
}

export function ChatPanel({ agentId, className }: ChatPanelProps) {
  const [pendingText, setPendingText] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    "claude-sonnet-4-20250514"
  );

  const { messages, isProcessing, sendMessage, cancel } =
    useCanvasBuilder(agentId);

  const handleSubmit = useCallback(
    (message: { text?: string; files?: unknown[] }) => {
      const hasContent =
        Boolean(message.text?.trim()) || Boolean(message.files?.length);
      if (!hasContent || isProcessing) {
        return;
      }
      sendMessage(message.text ?? "");
      setPendingText("");
    },
    [isProcessing, sendMessage]
  );

  const handleStopClick = useCallback(() => {
    cancel();
  }, [cancel]);

  const status = isProcessing ? "streaming" : "ready";

  return (
    <div
      className={cn(
        "flex h-full flex-col border-border/50 border-r",
        className
      )}
    >
      <div className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <ChatGreeting onSuggestionClick={setPendingText} />
        ) : (
          <AgentMessageList isStreaming={isProcessing} messages={messages} />
        )}
      </div>

      <div className="p-4">
        <PromptInput
          accept="image/*"
          className={cn(
            "rounded-md border border-border/50 bg-background",
            "ring-ring/50 focus-within:ring-1",
            isProcessing && "opacity-80"
          )}
          maxFiles={5}
          multiple
          onSubmit={handleSubmit}
        >
          <PromptInputBody>
            <PromptInputAttachments>
              {(file) => <PromptInputAttachment data={file} />}
            </PromptInputAttachments>

            <EditorWithExternalText
              disabled={isProcessing}
              externalText={pendingText}
              onExternalTextConsumed={() => setPendingText("")}
              placeholder="Describe your workflow..."
            />

            <PromptInputToolbar>
              <PromptInputTools>
                <ModelSelect
                  onValueChange={setSelectedModel}
                  showBadges={false}
                  size="sm"
                  triggerClassName="h-7 w-auto min-w-0 gap-1.5 border-0 bg-transparent px-2 text-xs shadow-none hover:bg-accent"
                  value={selectedModel}
                />
                <PromptInputActionAddAttachments />
              </PromptInputTools>

              <SubmitButton
                isProcessing={isProcessing}
                onStopClick={handleStopClick}
                status={status}
              />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}

interface EditorWithExternalTextProps {
  disabled?: boolean;
  externalText: string;
  onExternalTextConsumed: () => void;
  placeholder?: string;
}

function EditorWithExternalText({
  disabled,
  externalText,
  onExternalTextConsumed,
  placeholder,
}: EditorWithExternalTextProps) {
  const { setText } = usePromptInputText();

  useEffect(() => {
    if (externalText) {
      setText(externalText);
      onExternalTextConsumed();
    }
  }, [externalText, setText, onExternalTextConsumed]);

  return (
    <PromptInputEditor
      autoFocus
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}

interface SubmitButtonProps {
  status: "streaming" | "submitted" | "ready" | "error";
  isProcessing: boolean;
  onStopClick: () => void;
}

function SubmitButton({
  status,
  isProcessing,
  onStopClick,
}: SubmitButtonProps) {
  const { text } = usePromptInputText();
  const attachments = usePromptInputAttachments();
  const hasContent = text.trim().length > 0 || attachments.files.length > 0;
  const canInteract = hasContent || isProcessing;

  return (
    <PromptInputSubmit
      disabled={!canInteract}
      onClick={isProcessing ? onStopClick : undefined}
      status={status}
    />
  );
}
