"use client";

import type { InputField, InputNodeConfig } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Icons } from "../../icons";
import { Input } from "../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { InputFieldEditor } from "./input-field-editor";

interface SectionProps {
  config: InputNodeConfig;
  onChange: (config: Partial<InputNodeConfig>) => void;
}

export const PromptSection = memo(function PromptSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Text className="size-4" />}
      title="Prompt"
    >
      <ConfigField label="Prompt Message" required>
        <Textarea
          className="min-h-[80px] resize-y"
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Please provide your details..."
          value={config.prompt ?? ""}
        />
      </ConfigField>
    </ConfigSection>
  );
});

PromptSection.displayName = "PromptSection";

export const FieldsSection = memo(function FieldsSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const fields = config.fields ?? [];

  const handleFieldsChange = useCallback(
    (updated: InputField[]) => {
      onChange({ fields: updated });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={fields.length || undefined}
      defaultOpen
      icon={<Icons.Clipboard className="size-4" />}
      title="Fields"
    >
      <InputFieldEditor fields={fields} onChange={handleFieldsChange} />
    </ConfigSection>
  );
});

FieldsSection.displayName = "FieldsSection";

export const SubmitSection = memo(function SubmitSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const allowSkip = config.allowSkip ?? false;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.CheckIcon className="size-4" />}
      title="Submit"
    >
      <div className="space-y-4">
        <ConfigField label="Button Label">
          <Input
            className="h-9"
            onChange={(e) => onChange({ submitLabel: e.target.value })}
            placeholder="Submit"
            value={config.submitLabel ?? "Submit"}
          />
        </ConfigField>

        <ConfigField horizontal label="Allow Skip">
          <Switch
            checked={allowSkip}
            onCheckedChange={(checked) => onChange({ allowSkip: checked })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {allowSkip && (
            <ConfigField label="Skip Label">
              <Input
                className="h-9"
                onChange={(e) => onChange({ skipLabel: e.target.value })}
                placeholder="Skip"
                value={config.skipLabel ?? "Skip"}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

SubmitSection.displayName = "SubmitSection";

export const InputTimeoutSection = memo(function InputTimeoutSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const hasTimeout = (config.timeoutMs ?? 0) > 0;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Clock className="size-4" />}
      title="Timeout"
    >
      <div className="space-y-4">
        <ConfigField label="Timeout (ms)" tooltip="0 = no timeout">
          <Input
            className="h-9 font-mono"
            min={0}
            onChange={(e) =>
              onChange({
                timeoutMs: Number.parseInt(e.target.value, 10) || undefined,
              })
            }
            type="number"
            value={config.timeoutMs ?? 0}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {hasTimeout && (
            <ConfigField label="Timeout Action">
              <Select
                onValueChange={(v) =>
                  onChange({
                    timeoutAction: v as InputNodeConfig["timeoutAction"],
                  })
                }
                value={config.timeoutAction ?? "error"}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="default">Use Defaults</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

InputTimeoutSection.displayName = "InputTimeoutSection";
