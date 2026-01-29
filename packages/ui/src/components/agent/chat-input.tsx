"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "../../utils/cn";

export interface ChatInputRef {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}

export interface ChatInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxHeight?: number;
  className?: string;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      value,
      onValueChange,
      onSubmit,
      placeholder = "Ask anything...",
      disabled = false,
      autoFocus = false,
      maxHeight = 200,
      className,
    },
    ref
  ) => {
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          hardBreak: {
            keepMarks: false,
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass:
            "before:pointer-events-none before:float-left before:h-0 before:text-[rgba(102,102,102,0.5)] before:content-[attr(data-placeholder)]",
        }),
      ],
      content: value || "",
      editable: !disabled,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: cn(
            "min-h-[55px] w-full resize-none bg-transparent p-3 pt-4 text-sm",
            "shadow-none outline-none ring-0 focus:outline-none focus-visible:ring-0",
            "[&_p]:m-0 [&_p]:leading-relaxed",
            "text-foreground caret-foreground"
          ),
        },
        handleKeyDown: (view, event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.metaKey) {
            const text = view.state.doc.textContent.trim();
            if (text && onSubmitRef.current) {
              event.preventDefault();
              onSubmitRef.current();
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const text = ed.getText();
        onValueChange?.(text);
      },
    });

    useEffect(() => {
      if (editor && value !== undefined && editor.getText() !== value) {
        editor.commands.setContent(value || "");
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    useEffect(() => {
      if (editor && autoFocus) {
        setTimeout(() => editor.commands.focus("end"), 0);
      }
    }, [editor, autoFocus]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus("end"),
        clear: () => editor?.commands.clearContent(),
        getValue: () => editor?.getText() || "",
        setValue: (val: string) => editor?.commands.setContent(val),
      }),
      [editor]
    );

    return (
      <div
        className={cn(
          "relative w-full overflow-hidden",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        style={{ maxHeight }}
      >
        <div className="overflow-y-auto" style={{ maxHeight }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
