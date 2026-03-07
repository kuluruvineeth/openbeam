"use client";

import { TooltipProvider } from "@openbeam/ui";
import type { Capability, UserRole } from "@/features/chat/types";
import { AgentModeToggle } from "./toolbar/agent-mode-toggle";
import { AttachButton } from "./toolbar/attach-button";
import { CapabilitySelector } from "./toolbar/capability-selector";
import { MCPConnectorsDropdown } from "./toolbar/mcp-connectors-dropdown";
import { ModelSelector } from "./toolbar/model-selector";
import { SendStopButton } from "./toolbar/send-stop-button";

type Props = {
  userRole: UserRole;
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
  userRole,
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

        {showAdvancedOptions &&
          (userRole === "superadmin" || userRole === "admin") && (
            <MCPConnectorsDropdown isAgenticMode={isAgenticMode} />
          )}
        <MCPConnectorsDropdown isAgenticMode={isAgenticMode} />

        {showAdvancedOptions &&
          (userRole === "admin" || userRole === "superadmin") && (
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
