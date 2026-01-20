"use client";

import { Button } from "@openplane/ui";
import { Icons } from "@/components/icons";
import type { FileType, SelectedFile } from "@/features/chat/types";

type Props = {
  files: SelectedFile[];
  onRemove: (id: string) => void;
  maxAttachments?: number;
};

const MAX_ATTACHMENTS = 5;

const getFileIcon = (fileType: FileType | string | undefined) => {
  switch (fileType) {
    case "image":
      return (
        <Icons.FileImageIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    case "document":
      return (
        <Icons.FileTextIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    case "spreadsheet":
      return (
        <Icons.FileSpreadsheetIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    case "presentation":
      return (
        <Icons.PresentationIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    case "pdf":
      return (
        <Icons.FileTextIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    case "text":
      return (
        <Icons.FileTextIcon
          className="shrink-0 text-muted-foreground"
          size={24}
        />
      );
    default:
      return (
        <Icons.FileIcon className="shrink-0 text-muted-foreground" size={24} />
      );
  }
};

export function FileAttachments({
  files,
  onRemove,
  maxAttachments = MAX_ATTACHMENTS,
}: Props) {
  if (files.length === 0) {
    return null;
  }

  const uploadingCount = files.filter((f) => f.uploading).length;

  return (
    <div className="border-border border-t px-4 py-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          Attachments ({files.length}/{maxAttachments})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <div className="group relative" key={file.id}>
            {file.preview ? (
              <div
                className="relative h-20 w-20 overflow-hidden border border-border bg-center bg-cover transition-colors hover:border-border"
                style={{
                  backgroundImage: `url(${file.preview})`,
                }}
              >
                <div className="absolute top-1 left-1 flex gap-1">
                  {file.uploading && (
                    <div className="bg-black bg-opacity-60 p-1">
                      <Icons.Loader2Icon
                        className="animate-spin text-white"
                        size={10}
                      />
                    </div>
                  )}
                  {file.uploadError && (
                    <div
                      className="bg-red-500 bg-opacity-80 p-1"
                      title={file.uploadError}
                    >
                      <span className="text-white text-xs">⚠</span>
                    </div>
                  )}
                  {!(file.uploading || file.uploadError) && (
                    <div className="bg-green-500 bg-opacity-80 p-1">
                      <Icons.CheckIcon className="text-white" size={10} />
                    </div>
                  )}
                </div>
                <Button
                  className="absolute top-1 right-1 h-auto bg-black bg-opacity-60 p-1 text-white transition-opacity hover:bg-opacity-80"
                  onClick={() => onRemove(file.id)}
                  variant="ghost"
                >
                  <Icons.XIcon size={10} />
                </Button>
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <span
                    className="block truncate text-white text-xs"
                    title={file.file.name}
                  >
                    {file.file.name.length > 12
                      ? `${file.file.name.substring(0, 9)}...`
                      : file.file.name}
                  </span>
                  <span className="block text-white text-xs opacity-80">
                    {file.fileType}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2 border border-border bg-muted px-3 py-2 transition-colors hover:border-border">
                {getFileIcon(file.fileType)}
                <div className="min-w-0 flex-1">
                  <span
                    className="block max-w-[120px] truncate text-foreground text-sm"
                    title={file.file.name}
                  >
                    {file.file.name}
                  </span>
                  <span
                    className="block max-w-[120px] truncate text-muted-foreground text-xs"
                    title={file.fileType}
                  >
                    {file.fileType}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {file.uploading && (
                    <Icons.Loader2Icon
                      className="animate-spin text-muted-foreground"
                      size={12}
                    />
                  )}
                  {file.uploadError && (
                    <span
                      className="text-destructive text-xs"
                      title={file.uploadError}
                    >
                      Warning
                    </span>
                  )}
                  {!(file.uploading || file.uploadError) && (
                    <Icons.CheckIcon
                      className="text-muted-foreground"
                      size={12}
                    />
                  )}
                  <Button
                    className="h-auto p-1 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => onRemove(file.id)}
                    variant="ghost"
                  >
                    <Icons.XIcon size={12} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {uploadingCount > 0 && (
        <div className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
          <Icons.Loader2Icon className="animate-spin" size={12} />
          Uploading files...
        </div>
      )}
      {files.length >= maxAttachments && (
        <div className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
          <span>Warning</span>
          Maximum attachments reached ({maxAttachments})
        </div>
      )}
    </div>
  );
}
