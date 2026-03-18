"use client";

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogTrigger,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { useVoiceFeedback } from "../hooks/use-voice-feedback";
import { AudioVisualizer } from "./audio-visualizer";

const CATEGORIES = [
  { value: "data-request", label: "Index data" },
  { value: "bug", label: "Broken" },
  { value: "enhancement", label: "Add feature" },
  { value: "ux-feedback", label: "Other" },
] as const;

function RecordStep({
  onStart,
  onType,
  isSupported,
}: {
  onStart: () => void;
  onType: () => void;
  isSupported: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {isSupported && (
        <button
          className="group relative flex size-16 items-center justify-center rounded-full border border-border/50 bg-muted/50 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
          onClick={onStart}
          type="button"
        >
          <Icons.Mic size={24} />
          <span className="absolute inset-0 rounded-full border-2 border-transparent transition-colors group-hover:border-primary/20" />
        </button>
      )}
      <p className="text-muted-foreground text-xs">
        {isSupported ? "Tap to speak your mind" : "Type your feedback below"}
      </p>
      {isSupported && (
        <p className="text-[10px] text-muted-foreground/40">or type below</p>
      )}
      <Textarea
        className="min-h-[80px] w-full resize-none text-sm"
        onFocus={onType}
        placeholder="What should we fix or add?"
      />
    </div>
  );
}

function ListeningStep({
  bands,
  interimTranscript,
  duration,
  onStop,
  onCancel,
}: {
  bands: number[];
  interimTranscript: string;
  duration: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const timeStr =
    mins > 0
      ? `${mins}:${String(secs).padStart(2, "0")}`
      : `0:${String(secs).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <button
        className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        onClick={onStop}
        type="button"
      >
        <AudioVisualizer bands={bands} isActive />
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
      </button>

      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
        <span>Listening...</span>
        <span className="font-mono tabular-nums">{timeStr}</span>
      </div>

      {interimTranscript && (
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="max-w-full text-center text-foreground/60 text-sm leading-relaxed"
          initial={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
        >
          {interimTranscript}
        </motion.p>
      )}

      <Button onClick={onCancel} size="sm" variant="ghost">
        Cancel
      </Button>
    </div>
  );
}

function ReviewStep({
  transcript,
  setTranscript,
  category,
  setCategory,
  onSubmit,
  onDiscard,
  isSubmitting,
  error,
}: {
  transcript: string;
  setTranscript: (t: string) => void;
  category: string;
  setCategory: (
    c: "data-request" | "bug" | "enhancement" | "ux-feedback"
  ) => void;
  onSubmit: () => void;
  onDiscard: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <Textarea
        className="min-h-[80px] resize-none text-sm"
        onChange={(e) => setTranscript(e.target.value)}
        value={transcript}
      />

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs">What kind of feedback?</p>
        <ToggleGroup
          className="justify-start"
          onValueChange={(val) => {
            if (val) {
              setCategory(
                val as "data-request" | "bug" | "enhancement" | "ux-feedback"
              );
            }
          }}
          type="single"
          value={category}
        >
          {CATEGORIES.map((cat) => (
            <ToggleGroupItem
              className="h-7 px-2.5 text-xs"
              key={cat.value}
              value={cat.value}
            >
              {cat.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          disabled={isSubmitting}
          onClick={onDiscard}
          size="sm"
          variant="ghost"
        >
          Discard
        </Button>
        <Button
          disabled={isSubmitting || transcript.trim().length < 10}
          onClick={onSubmit}
          size="sm"
        >
          {isSubmitting ? (
            <Icons.Spinner className="size-3.5 animate-spin" />
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Icons.CheckCircle className="size-6 text-primary" />
      <p className="text-foreground text-sm">Got it. We'll look into it.</p>
    </motion.div>
  );
}

type VoiceFeedbackDialogProps = {
  page: string;
};

export function VoiceFeedbackDialog({ page }: VoiceFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [textMode, setTextMode] = useState(false);

  const feedback = useVoiceFeedback(page);

  useHotkeys("mod+shift+f", (e) => {
    e.preventDefault();
    setOpen(true);
  });

  const handleClose = useCallback(() => {
    setOpen(false);
    setTextMode(false);
    feedback.discard();
  }, [feedback]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setOpen(true);
      } else {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleTextMode = useCallback(() => {
    setTextMode(true);
    feedback.discard();
  }, [feedback]);


  const showRecord = feedback.state === "idle" && !textMode;
  const showListening = feedback.state === "listening";
  const showReview =
    feedback.state === "committed" || feedback.state === "error" || textMode;
  const showDone = feedback.state === "done";

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "fixed right-4 bottom-4 z-40 flex items-center gap-1.5 rounded-sm border border-border/50 bg-background px-3 py-1.5 text-muted-foreground/60 text-xs transition-colors hover:border-border hover:text-foreground",
            open && "hidden"
          )}
          type="button"
        >
          <Icons.MessageSquare size={13} />
          <span>Feedback</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[400px] gap-0 p-4">
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-medium text-foreground text-sm">
            What should we fix or add?
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {showDone && (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="done"
              transition={{ duration: 0.15 }}
            >
              <DoneStep onClose={handleClose} />
            </motion.div>
          )}

          {showListening && (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="listening"
              transition={{ duration: 0.15 }}
            >
              <ListeningStep
                bands={feedback.bands}
                duration={feedback.duration}
                interimTranscript={feedback.interimTranscript}
                onCancel={feedback.discard}
                onStop={feedback.stopRecording}
              />
            </motion.div>
          )}

          {showReview && (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="review"
              transition={{ duration: 0.15 }}
            >
              <ReviewStep
                category={feedback.category}
                error={feedback.error}
                isSubmitting={feedback.state === "processing"}
                onDiscard={feedback.discard}
                onSubmit={feedback.submit}
                setCategory={feedback.setCategory}
                setTranscript={feedback.setTranscript}
                transcript={feedback.transcript}
              />
            </motion.div>
          )}

          {showRecord && (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="record"
              transition={{ duration: 0.15 }}
            >
              <RecordStep
                isSupported={feedback.isSupported}
                onStart={feedback.startRecording}
                onType={handleTextMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div aria-live="polite" className="sr-only">
          {feedback.state === "listening" && "Recording. Speak now."}
          {feedback.state === "committed" &&
            `Recording complete. Review your transcript: ${feedback.transcript}`}
          {feedback.state === "processing" && "Submitting feedback."}
          {feedback.state === "done" && "Feedback submitted successfully."}
          {feedback.state === "error" && `Error: ${feedback.error}`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
