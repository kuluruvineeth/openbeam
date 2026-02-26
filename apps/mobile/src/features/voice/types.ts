export type DictationStatus = "idle" | "recording" | "uploading" | "failed";

export type DictationToastVariant = "info" | "success" | "warning" | "error";

export type VoiceStreamClient = {
  isConnected: boolean;
  startDictationStream: (dictationId: string, format: string) => Promise<void>;
  sendDictationStreamChunk: (
    dictationId: string,
    seq: number,
    audio: string,
    format: string
  ) => void;
  finishDictationStream: (
    dictationId: string,
    finalSeq: number
  ) => Promise<{ dictationId: string; text: string }>;
  cancelDictationStream: (dictationId: string) => void;
  subscribeConnectionStatus?: (
    callback: (status: { status: string }) => void
  ) => () => void;
  on?: (
    event: string,
    callback: (message: {
      type: string;
      payload: { dictationId: string; text?: string };
    }) => void
  ) => () => void;
};

export type AudioCaptureConfig = {
  sampleRate?: number;
  numberOfChannels?: number;
  bitRate?: number;
  onAudioLevel?: (level: number) => void;
  onSpeechSegment?: (segment: { audioData: string; isLast: boolean }) => void;
  enableContinuousRecording?: boolean;
};

export type AudioRecorderResult = {
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  isRecording: boolean;
  volume: number;
};

export type AudioPlayerResult = {
  play: (audioData: string) => Promise<void>;
  stop: () => Promise<void>;
  clearQueue: () => void;
  isPlaying: boolean;
};

export type DictationAudioSourceConfig = {
  onPcmSegment: (base64Audio: string) => void;
  onError?: (error: Error) => void;
};

export type DictationAudioSource = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  volume: number;
};

export type UseDictationOptions = {
  client: VoiceStreamClient | null;
  onTranscript: (text: string, meta: { requestId: string }) => void;
  onPartialTranscript?: (text: string, meta: { requestId: string }) => void;
  onError?: (error: Error) => void;
  onPermanentFailure?: (error: Error, context: { requestId: string }) => void;
  canStart?: () => boolean;
  canConfirm?: () => boolean;
  autoStopWhenHidden?: { isVisible: boolean };
  enableDuration?: boolean;
};

export type UseDictationResult = {
  isRecording: boolean;
  isProcessing: boolean;
  partialTranscript: string;
  volume: number;
  duration: number;
  error: string | null;
  status: DictationStatus;
  startDictation: () => Promise<void>;
  cancelDictation: () => Promise<void>;
  confirmDictation: () => Promise<void>;
  retryFailedDictation: () => Promise<void>;
  discardFailedDictation: () => void;
  reset: () => void;
};

export type DictationControlsProps = {
  volume: number;
  duration: number;
  transcript?: string;
  isRecording: boolean;
  isProcessing: boolean;
  status: DictationStatus;
  onStart: () => void;
  onCancel: () => void;
  onAccept: () => void;
  onAcceptAndSend: () => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
};

export type DictationOverlayProps = Omit<
  DictationControlsProps,
  "onStart" | "disabled" | "transcript"
> & {
  errorText?: string;
};

export type DictationStatusNoticeProps = {
  variant: DictationToastVariant;
  title: string;
  subtitle?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};
