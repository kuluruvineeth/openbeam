"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { FileUIPart } from "ai";
import {
  type ChangeEventHandler,
  type ComponentProps,
  createContext,
  type FormEvent,
  type FormEventHandler,
  Fragment,
  type HTMLAttributes,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { Icons } from "./icons";

type AttachmentsContext = {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

type TextContext = {
  text: string;
  setText: (text: string) => void;
};

type PromptInputContextValue = AttachmentsContext & TextContext;

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

export const usePromptInputAttachments = () => {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput"
    );
  }
  return context;
};

export const usePromptInputText = () => {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error("usePromptInputText must be used within a PromptInput");
  }
  return { text: context.text, setText: context.setText };
};

export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart & { id: string };
  className?: string;
};

export function PromptInputAttachment({
  data,
  className,
  ...props
}: PromptInputAttachmentProps) {
  const attachments = usePromptInputAttachments();

  return (
    <div
      className={cn(
        "group relative h-14 w-14 rounded-sm border border-border/50",
        className
      )}
      key={data.id}
      {...props}
    >
      {data.mediaType?.startsWith("image/") && data.url ? (
        // biome-ignore lint/performance/noImgElement: Shared UI component
        <img
          alt={data.filename || "attachment"}
          className="size-full rounded-sm object-cover"
          height={56}
          src={data.url}
          width={56}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Icons.PaperclipIcon className="size-4" />
        </div>
      )}
      <Button
        aria-label="Remove attachment"
        className="-right-1.5 -top-1.5 absolute h-5 w-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => attachments.remove(data.id)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Icons.XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

export type PromptInputAttachmentsProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: (attachment: FileUIPart & { id: string }) => React.ReactNode;
};

export function PromptInputAttachments({
  className,
  children,
  ...props
}: PromptInputAttachmentsProps) {
  const attachments = usePromptInputAttachments();
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      setHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      aria-live="polite"
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-out",
        className
      )}
      style={{ height: attachments.files.length ? height : 0 }}
      {...props}
    >
      <div className="flex flex-wrap gap-2 px-3 pt-3" ref={contentRef}>
        {attachments.files.map((file) => (
          <Fragment key={file.id}>{children(file)}</Fragment>
        ))}
      </div>
    </div>
  );
}

export const PromptInputActionAddAttachments = ({
  className,
  ...props
}: ComponentProps<typeof Button>) => {
  const attachments = usePromptInputAttachments();

  return (
    <Button
      className={cn(
        "size-6 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => attachments.openFileDialog()}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <Icons.Plus size={16} />
    </Button>
  );
};

export type PromptInputMessage = {
  text?: string;
  files?: FileUIPart[];
};

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => void;
};

type TempItem = {
  id: string;
  type: "file";
  url: string;
  mediaType: string;
  filename: string;
};

type ConvertedFile = {
  type: "file";
  filename: string;
  mediaType: string;
  url: string;
};

function replaceBlobWithDataUrl(
  item: FileUIPart & { id: string },
  tempItems: TempItem[],
  convertedFiles: ConvertedFile[]
): FileUIPart & { id: string } {
  const itemUrl = item.url;
  if (!itemUrl || typeof itemUrl !== "string" || !itemUrl.startsWith("blob:")) {
    return item;
  }

  const tempItem = tempItems.find((temp) => temp.id === item.id);
  if (!tempItem) {
    return item;
  }

  const tempIndex = tempItems.indexOf(tempItem);
  if (tempIndex < 0 || tempIndex >= convertedFiles.length) {
    return item;
  }

  const converted = convertedFiles[tempIndex];
  if (!converted) {
    return item;
  }

  URL.revokeObjectURL(itemUrl);
  return {
    ...item,
    url: converted.url,
    filename: converted.filename,
  };
}

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  ...props
}: PromptInputProps) => {
  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const root = anchorRef.current?.closest("form");
    if (root instanceof HTMLFormElement) {
      formRef.current = root;
    }
  }, []);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = useCallback(
    (f: File) => {
      if (!accept || accept.trim() === "") {
        return true;
      }
      const acceptTypes = accept.split(",").map((t) => t.trim());
      return acceptTypes.some((type) => {
        if (type.endsWith("/*")) {
          const baseType = type.slice(0, -2);
          return f.type.startsWith(`${baseType}/`);
        }
        return f.type === type;
      });
    },
    [accept]
  );

  const convertFilesToDataURLs = useCallback(
    (
      files: FileList | File[]
    ): Promise<
      { type: "file"; filename: string; mediaType: string; url: string }[]
    > =>
      Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<{
              type: "file";
              filename: string;
              mediaType: string;
              url: string;
            }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  type: "file",
                  filename: file.name,
                  mediaType: file.type,
                  url: reader.result as string,
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      ),
    []
  );

  const add = useCallback(
    (files: File[] | FileList) => {
      const incoming = Array.from(files);
      const accepted = incoming.filter((f) => matchesAccept(f));
      if (accepted.length === 0) {
        onError?.({
          code: "accept",
          message: "No files match the accepted types.",
        });
        return;
      }
      const withinSize = (f: File) =>
        maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (sized.length === 0 && accepted.length > 0) {
        onError?.({
          code: "max_file_size",
          message: "All files exceed the maximum size.",
        });
        return;
      }
      setItems((prev) => {
        const capacity =
          typeof maxFiles === "number"
            ? Math.max(0, maxFiles - prev.length)
            : undefined;
        const capped =
          typeof capacity === "number" ? sized.slice(0, capacity) : sized;
        if (typeof capacity === "number" && sized.length > capacity) {
          onError?.({
            code: "max_files",
            message: "Too many files. Some were not added.",
          });
        }

        const tempItems = capped.map((file, index) => {
          const blobUrl = URL.createObjectURL(file);
          return {
            id: `${file.name}-${index}-${Date.now()}`,
            type: "file" as const,
            url: blobUrl,
            mediaType: file.type,
            filename: file.name,
          };
        });

        convertFilesToDataURLs(capped).then((convertedFiles) => {
          setItems((current) =>
            current.map((item) =>
              replaceBlobWithDataUrl(item, tempItems, convertedFiles)
            )
          );
        });

        return prev.concat(tempItems);
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError, convertFilesToDataURLs]
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const found = prev.find((file) => file.id === id);
      if (found?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      for (const file of prev) {
        if (file.url?.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      }
      return [];
    });
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [add]);

  useEffect(() => {
    if (!globalDrop) {
      return;
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) {
      add(event.currentTarget.files);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const files: FileUIPart[] = items.map(({ ...item }) => ({
      ...item,
    }));
    onSubmit({ text, files }, event);
    setText("");
    clear();
  };

  const ctx = useMemo<PromptInputContextValue>(
    () => ({
      files: items.map((item) => ({ ...item, id: item.id })),
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef: inputRef,
      text,
      setText,
    }),
    [items, add, remove, clear, openFileDialog, text]
  );

  return (
    <PromptInputContext.Provider value={ctx}>
      <span aria-hidden="true" className="hidden" ref={anchorRef} />
      <input
        accept={accept}
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
      <form
        className={cn("w-full overflow-hidden bg-transparent", className)}
        onSubmit={handleSubmit}
        {...props}
      />
    </PromptInputContext.Provider>
  );
};

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({
  className,
  ...props
}: PromptInputBodyProps) => (
  <div className={cn(className, "flex flex-col")} {...props} />
);

export interface PromptInputEditorProps {
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxHeight?: number;
  className?: string;
}

export const PromptInputEditor = ({
  placeholder = "Ask anything...",
  disabled = false,
  autoFocus = false,
  maxHeight = 120,
  className,
}: PromptInputEditorProps) => {
  const { text, setText } = usePromptInputText();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: { keepMarks: false },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:pointer-events-none before:float-left before:h-0 before:text-muted-foreground/50 before:content-[attr(data-placeholder)]",
      }),
    ],
    content: text || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[55px] w-full resize-none bg-transparent px-3 py-4 text-sm",
          "outline-none ring-0 focus:outline-none focus-visible:ring-0",
          "[&_p]:m-0 [&_p]:leading-relaxed",
          "text-foreground caret-foreground"
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.metaKey) {
          if (event.isComposing) {
            return false;
          }
          const content = view.state.doc.textContent.trim();
          if (content) {
            event.preventDefault();
            const form = view.dom.closest("form");
            if (form) {
              form.requestSubmit();
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setText(ed.getText());
    },
  });

  useEffect(() => {
    if (editor && text !== editor.getText()) {
      editor.commands.setContent(text || "");
    }
  }, [editor, text]);

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
};

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputToolbar = ({
  className,
  ...props
}: PromptInputToolbarProps) => (
  <div
    className={cn("flex items-center justify-between px-3 pb-3", className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div className={cn("flex items-center gap-3", className)} {...props} />
);

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: "streaming" | "submitted" | "ready" | "error";
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon",
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <Icons.ChevronUp size={16} />;

  if (status === "streaming" || status === "submitted") {
    Icon = <div className="h-3 w-3 rounded-[2px] bg-current" />;
  } else if (status === "error") {
    Icon = <Icons.XIcon className="size-4" />;
  }

  const buttonType =
    status === "streaming" || status === "submitted" ? "button" : "submit";

  return (
    <Button
      className={cn("size-8 gap-1.5", className)}
      size={size}
      type={buttonType}
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};
