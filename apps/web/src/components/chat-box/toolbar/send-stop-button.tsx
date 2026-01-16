"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@openplane/ui";
import { Icons } from "@/components/icons";

type Props = {
  isStreaming: boolean;
  retryIsStreaming: boolean;
  onSend: () => void;
  onStop?: () => void;
};

export function SendStopButton({
  isStreaming,
  retryIsStreaming,
  onSend,
  onStop,
}: Props) {
  const isSendDisabled = isStreaming || retryIsStreaming;

  if (isStreaming || retryIsStreaming) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="mr-6"
            onClick={onStop}
            size="icon"
            variant="default"
          >
            <Icons.SquareIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Stop</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="mr-6"
          disabled={isSendDisabled}
          onClick={onSend}
          size="icon"
          variant="default"
        >
          <Icons.ArrowRight className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isSendDisabled ? "Cannot send" : "Send"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
