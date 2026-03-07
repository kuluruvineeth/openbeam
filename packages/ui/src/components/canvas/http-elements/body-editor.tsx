"use client";

import type { HttpBodyType, KeyValuePair } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Textarea } from "../../textarea";
import { KeyValueEditor } from "./key-value-editor";

interface BodyEditorProps {
  bodyType: HttpBodyType;
  bodyContent: string;
  bodyFormFields: KeyValuePair[];
  onContentChange: (content: string) => void;
  onFormFieldsChange: (fields: KeyValuePair[]) => void;
  disabled?: boolean;
}

const LANGUAGE_PLACEHOLDERS: Partial<Record<HttpBodyType, string>> = {
  json: '{\n  "key": "value"\n}',
  xml: '<?xml version="1.0"?>\n<root>\n  <element>value</element>\n</root>',
  raw: "Enter request body...",
};

export const BodyEditor = memo(
  forwardRef<HTMLDivElement, BodyEditorProps>(function BodyEditorComponent(
    {
      bodyType,
      bodyContent,
      bodyFormFields,
      onContentChange,
      onFormFieldsChange,
      disabled,
    },
    ref
  ) {
    const handleContentChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onContentChange(e.target.value);
      },
      [onContentChange]
    );

    if (bodyType === "none" || bodyType === "binary") {
      return null;
    }

    if (bodyType === "form_urlencoded" || bodyType === "form_data") {
      return (
        <div ref={ref}>
          <KeyValueEditor
            addLabel="Add field"
            disabled={disabled}
            keyPlaceholder="Field name"
            onChange={onFormFieldsChange}
            pairs={bodyFormFields}
            valuePlaceholder="Field value"
          />
        </div>
      );
    }

    return (
      <div ref={ref}>
        <Textarea
          className="min-h-[120px] resize-y font-mono text-xs"
          disabled={disabled}
          onChange={handleContentChange}
          placeholder={LANGUAGE_PLACEHOLDERS[bodyType] ?? "Enter body..."}
          spellCheck={false}
          value={bodyContent}
        />
      </div>
    );
  })
);

BodyEditor.displayName = "BodyEditor";
