export {
  DictationControls,
  DictationOverlay,
  DictationStatusNotice,
  VolumeMeter,
} from "./components";
export {
  BIT_DEPTH,
  BUTTON_SIZE,
  DETECTION_GRACE_PERIOD_MS,
  DURATION_TICK_MS,
  NUM_CHANNELS,
  OVERLAY_BUTTON_SIZE,
  PCM_DICTATION_FORMAT,
  SAMPLE_RATE,
  SILENCE_DURATION_MS,
  SPEECH_CONFIRMATION_MS,
  TOAST_COLORS,
  VOLUME_THRESHOLD,
} from "./constants";
export {
  useAudioPlayerHook,
  useAudioRecorderHook,
  useDictation,
  useDictationAudioSource,
} from "./hooks";
export { DictationStreamSender } from "./lib";
export type {
  AudioCaptureConfig,
  AudioPlayerResult,
  AudioRecorderResult,
  DictationAudioSource,
  DictationAudioSourceConfig,
  DictationControlsProps,
  DictationOverlayProps,
  DictationStatus,
  DictationStatusNoticeProps,
  DictationToastVariant,
  UseDictationOptions,
  UseDictationResult,
  VoiceStreamClient,
} from "./types";
