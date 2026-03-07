"use client";

import type { InputNodeConfig } from "@openbeam/types/canvas";
import { memo } from "react";
import {
  FieldsSection,
  InputTimeoutSection,
  PromptSection,
  SubmitSection,
} from "../../ai-elements/input-config-sections";

interface InputConfigPanelProps {
  config: InputNodeConfig;
  onChange: (updates: Partial<InputNodeConfig>) => void;
}

export const InputConfigPanel = memo(function InputConfigPanelComponent({
  config,
  onChange,
}: InputConfigPanelProps) {
  return (
    <div className="divide-y divide-border/50">
      <PromptSection config={config} onChange={onChange} />
      <FieldsSection config={config} onChange={onChange} />
      <SubmitSection config={config} onChange={onChange} />
      <InputTimeoutSection config={config} onChange={onChange} />
    </div>
  );
});

InputConfigPanel.displayName = "InputConfigPanel";
