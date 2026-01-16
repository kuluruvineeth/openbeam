"use client";

import { TooltipProvider } from "@openplane/ui";
import { AgentModeToggle } from "@/components/chat-box/toolbar/agent-mode-toggle";
import { AttachButton } from "@/components/chat-box/toolbar/attach-button";
import { CapabilitySelector } from "@/components/chat-box/toolbar/capability-selector";
import { MCPConnectorsDropdown } from "@/components/chat-box/toolbar/mcp-connectors-dropdown";
import { ModelSelector } from "@/components/chat-box/toolbar/model-selector";
import { SendStopButton } from "@/components/chat-box/toolbar/send-stop-button";
import type { Capability, UserRole } from "@/components/chat-box/types";

type Props = {
  role: UserRole;
  selectedCapability: Capability;
  onCapabilityChange: (capability: Capability) => void;
  isAgenticMode: boolean;
  onAgenticModeToggle: () => void;
  selectedModel: string;
  availableModels: Array<{
    labelName: string;
    description?: string;
    provider: "openai" | "google" | "anthropic" | "other";
  }>;
  onModelSelect: (model: string) => void;
  isStreaming: boolean;
  retryIsStreaming: boolean;
  onSend: () => void;
  onStop?: () => void;
  showAdvancedOptions: boolean;
  isKnowledgeBaseChat?: boolean;
  onAttachClick?: () => void;
  canAttach?: boolean;
};

export function ChatToolbar({
  role,
  selectedCapability,
  onCapabilityChange,
  isAgenticMode,
  onAgenticModeToggle,
  selectedModel,
  availableModels,
  onModelSelect,
  isStreaming,
  retryIsStreaming,
  onSend,
  onStop,
  showAdvancedOptions,
  isKnowledgeBaseChat = false,
  onAttachClick,
  canAttach = true,
}: Props) {
  return (
    <TooltipProvider>
      <div className="mr-[6px] mb-[6px] ml-[16px] flex items-center space-x-3 pt-1 pb-1">
        {!isKnowledgeBaseChat && (
          <AttachButton canAttach={canAttach} onAttachClick={onAttachClick} />
        )}

        {showAdvancedOptions && (
          <CapabilitySelector
            onCapabilityChange={onCapabilityChange}
            selectedCapability={selectedCapability}
          />
        )}

        {showAdvancedOptions && (role === "superadmin" || role === "admin") && (
          <MCPConnectorsDropdown isAgenticMode={isAgenticMode} />
        )}
        <MCPConnectorsDropdown isAgenticMode={isAgenticMode} />

        {showAdvancedOptions && (role === "admin" || role === "superadmin") && (
          <AgentModeToggle
            isAgenticMode={isAgenticMode}
            onAgenticModeToggle={onAgenticModeToggle}
          />
        )}

        <AgentModeToggle
          isAgenticMode={isAgenticMode}
          onAgenticModeToggle={onAgenticModeToggle}
        />

        {showAdvancedOptions && (
          <ModelSelector
            availableModels={availableModels}
            onModelSelect={onModelSelect}
            selectedModel={selectedModel}
          />
        )}

        <SendStopButton
          isStreaming={isStreaming}
          onSend={onSend}
          onStop={onStop}
          retryIsStreaming={retryIsStreaming}
        />
      </div>
    </TooltipProvider>
  );
}
