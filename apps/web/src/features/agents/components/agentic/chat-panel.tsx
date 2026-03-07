"use client";

import { DEFAULT_CHAT_MODEL } from "@openbeam/types/ai";
import {
  AgentMessageList,
  Button,
  Icons,
  ModelSelect,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputEditor,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputText,
} from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectors } from "@/features/connectors";
import { AGENTIC_RUNTIME_STREAM_V2 } from "@/lib/feature-flags";
import {
  useAgenticRuntimeStream,
  useAgenticSession,
  useCanvasBuilder,
} from "../../hooks";
import { ChatGreeting } from "./chat-greeting";
import { SessionSwitcher } from "./session-switcher";

function resolveAttachmentType(mediaType: string): "image" | "document" {
  return mediaType.startsWith("image/") ? "image" : "document";
}

interface ChatPanelProps {
  agentId: string;
  initialSessionId?: string;
  onCollapse?: () => void;
  className?: string;
}

export function ChatPanel({
  agentId,
  initialSessionId,
  onCollapse,
  className,
}: ChatPanelProps) {
  const [pendingText, setPendingText] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);

  const { data: connectors } = useConnectors();

  const { session, createOrResume, createNew, switchTo } = useAgenticSession();
  const sessionId = session?.id ?? null;

  const initialSessionIdRef = useRef(initialSessionId);
  useEffect(() => {
    createOrResume(agentId, initialSessionIdRef.current);
  }, [agentId, createOrResume]);

  useAgenticRuntimeStream({
    sessionId: sessionId ?? "",
    enabled: AGENTIC_RUNTIME_STREAM_V2 && Boolean(sessionId),
  });

  const { messages, isProcessing, sendMessage, cancel } =
    useCanvasBuilder(agentId);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasContent =
        Boolean(message.text?.trim()) || Boolean(message.files?.length);
      if (!hasContent || isProcessing) {
        return;
      }

      const attachments = message.files?.map((file) => ({
        type: resolveAttachmentType(file.mediaType),
        url: file.url,
        name: file.filename ?? "attachment",
      }));

      sendMessage(message.text ?? "", {
        model: selectedModel,
        attachments: attachments?.length ? attachments : undefined,
      });
      setPendingText("");
    },
    [isProcessing, sendMessage, selectedModel]
  );

  const handleStopClick = useCallback(() => {
    cancel();
  }, [cancel]);

  const handleNewSession = useCallback(async () => {
    await createNew(agentId).catch((_: unknown) => _);
  }, [agentId, createNew]);

  const handleSessionSelect = useCallback(
    async (selectedSessionId: string) => {
      await switchTo(agentId, selectedSessionId).catch((_: unknown) => _);
    },
    [agentId, switchTo]
  );

  const status = isProcessing ? "streaming" : "ready";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center border-border/50 border-b px-3 py-2">
        <SessionSwitcher
          canvasId={agentId}
          currentSessionId={sessionId}
          onNewSession={handleNewSession}
          onSessionSelect={handleSessionSelect}
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            className="h-7 w-7"
            onClick={handleNewSession}
            size="icon"
            variant="ghost"
          >
            <Icons.Plus size={14} />
          </Button>
          {onCollapse && (
            <Button
              className="h-7 w-7"
              onClick={onCollapse}
              size="icon"
              variant="ghost"
            >
              <Icons.ChevronLeft size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <ChatGreeting
            connectors={connectors}
            onSuggestionClick={setPendingText}
          />
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
