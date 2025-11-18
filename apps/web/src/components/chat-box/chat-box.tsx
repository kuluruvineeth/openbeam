"use client";

import { useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ChatInput } from "./chat-input";
import { ChatToolbar } from "./chat-toolbar";
import { FileAttachments } from "./file-attachments";
import { ReferenceBox } from "./reference-box";
import type { Capability, ChatBoxProps, SelectedFile } from "./types";

type Props = ChatBoxProps & {
  agentName?: string | null;
  agentId?: string | null;
  selectedFiles?: SelectedFile[];
  onFileRemove?: (id: string) => void;
  onAttachClick?: () => void;
  showReferenceBox?: boolean;
  referenceBoxProps?: {
    searchMode: "citations" | "global";
    citations: Array<{
      docId: string;
      title: string;
      url?: string;
    }>;
    globalResults: Array<{
      docId: string;
      title?: string;
    }>;
    selectedIndex: number;
    searchTerm: string;
    isLoading?: boolean;
    error?: string | null;
  };
};

export function ChatBox({
  role,
  query,
  setQuery,
  isStreaming = false,
  retryIsStreaming = false,
  handleStop,
  hideButtons = false,
  isKnowledgeBaseChat = false,
  agentName,
  agentId,
  selectedFiles = [],
  onFileRemove,
  onAttachClick,
  showReferenceBox = false,
  referenceBoxProps,
}: Props) {
  const inputRef = useRef<HTMLDivElement>(null);
  const [selectedCapability, setSelectedCapability] =
    useState<Capability>(null);
  const [isAgenticMode, setIsAgenticMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels] = useState<
    Array<{
      labelName: string;
      description?: string;
      provider: "openai" | "google" | "anthropic" | "other";
    }>
  >([
    {
      labelName: "GPT-5.1",
      description: "Most capable OpenAI model",
      provider: "openai",
    },
    {
      labelName: "GPT-5",
      description: "Fast and efficient",
      provider: "openai",
    },
    {
      labelName: "Gemini 3",
      description: "Advanced reasoning model",
      provider: "google",
    },
    {
      labelName: "Gemini 2.5",
      description: "Most capable Google model",
      provider: "google",
    },
    {
      labelName: "Claude Sonnet 4.5",
      description: "Advanced reasoning model",
      provider: "anthropic",
    },
  ]);

  const showAdvancedOptions = !hideButtons;

  const handleSend = () => {
    // TODO: Implement send functionality
    console.log("Send message:", query);
  };

  const handleCapabilityChange = (capability: Capability) => {
    setSelectedCapability(
      selectedCapability === capability ? null : capability
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim().length > 0 && !isStreaming && !retryIsStreaming) {
        handleSend();
      }
    }
  };

  return (
    <div className="relative flex w-full max-w-3xl flex-col pb-5">
      {/* Agent Header */}
      {agentId && agentName && (
        <div className="flex items-center justify-between gap-2 border-border border-x border-t bg-muted px-4 py-3">
          <div className="flex items-center gap-2">
            <Icons.BotIcon className="text-muted-foreground" size={18} />
            <span className="font-mono text-muted-foreground text-sm uppercase tracking-wider">
              {agentName}
            </span>
          </div>
          <span className="font-mono text-muted-foreground text-sm uppercase tracking-wider">
            ASK AGENT
          </span>
        </div>
      )}

      {/* Reference Box */}
      {showReferenceBox && referenceBoxProps && (
        <ReferenceBox
          citations={referenceBoxProps.citations}
          error={referenceBoxProps.error}
          globalResults={referenceBoxProps.globalResults}
          isLoading={referenceBoxProps.isLoading}
          isOpen={showReferenceBox}
          onSearchTermChange={() => {
            // TODO: Implement search term change
          }}
          onSelectCitation={() => {
            // TODO: Implement citation selection
          }}
          onSelectResult={() => {
            // TODO: Implement result selection
          }}
          searchMode={referenceBoxProps.searchMode}
          searchTerm={referenceBoxProps.searchTerm}
          selectedIndex={referenceBoxProps.selectedIndex}
        />
      )}

      {/* Main Chat Container */}
      <div
        className={cn(
          "flex w-full flex-col border border-border bg-background",
          agentId && agentName && "border-t-0"
        )}
      >
        {/* Chat Input */}
        <ChatInput
          onKeyDown={handleKeyDown}
          placeholder={
            hideButtons
              ? "Ask a question"
              : "Ask a question or type @ to search your apps"
          }
          query={query}
          ref={inputRef}
          setQuery={setQuery}
        />

        {/* File Attachments */}
        {selectedFiles.length > 0 && (
          <FileAttachments
            files={selectedFiles}
            onRemove={
              onFileRemove ||
              (() => {
                // TODO: Implement file removal
              })
            }
          />
        )}

        {/* Toolbar */}
        <ChatToolbar
          availableModels={availableModels}
          canAttach={selectedFiles.length < 5}
          isAgenticMode={isAgenticMode}
          isKnowledgeBaseChat={isKnowledgeBaseChat}
          isStreaming={isStreaming}
          onAgenticModeToggle={() => setIsAgenticMode(!isAgenticMode)}
          onAttachClick={onAttachClick}
          onCapabilityChange={handleCapabilityChange}
          onModelSelect={setSelectedModel}
          onSend={handleSend}
          onStop={handleStop}
          retryIsStreaming={retryIsStreaming}
          role={role}
          selectedCapability={selectedCapability}
          selectedModel={selectedModel}
          showAdvancedOptions={showAdvancedOptions}
        />
      </div>
    </div>
  );
}
