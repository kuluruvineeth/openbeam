import type { VisionModel } from "./types";

export const OPENAI_VISION_MODELS: VisionModel[] = [
  {
    id: "gpt-4o-vision",
    name: "GPT-4o Vision",
    provider: "openai",
    supportsMultipleImages: true,
    supportsVideo: false,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
    pricing: { perImage: 0.002_55 },
  },
  {
    id: "gpt-5.2-vision",
    name: "GPT-5.2 Vision",
    provider: "openai",
    supportsMultipleImages: true,
    supportsVideo: true,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp", "mp4"],
    pricing: { perImage: 0.003, perMinuteVideo: 0.01 },
  },
];

export const ANTHROPIC_VISION_MODELS: VisionModel[] = [
  {
    id: "claude-4-vision",
    name: "Claude 4 Vision",
    provider: "anthropic",
    supportsMultipleImages: true,
    supportsVideo: false,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
    pricing: { perImage: 0.0024 },
  },
  {
    id: "claude-4.5-vision",
    name: "Claude 4.5 Vision",
    provider: "anthropic",
    supportsMultipleImages: true,
    supportsVideo: false,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp", "pdf"],
    pricing: { perImage: 0.003 },
  },
];

export const GOOGLE_VISION_MODELS: VisionModel[] = [
  {
    id: "gemini-3-pro-vision",
    name: "Gemini 3 Pro Vision",
    provider: "google",
    supportsMultipleImages: true,
    supportsVideo: true,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp", "mp4", "mov"],
    pricing: { perImage: 0.001, perMinuteVideo: 0.005 },
  },
  {
    id: "gemini-2.5-flash-vision",
    name: "Gemini 2.5 Flash Vision",
    provider: "google",
    supportsMultipleImages: true,
    supportsVideo: true,
    supportedFormats: ["png", "jpg", "jpeg", "gif", "webp", "mp4"],
    pricing: { perImage: 0.0002, perMinuteVideo: 0.001 },
  },
];

export const VISION_MODELS: VisionModel[] = [
  ...OPENAI_VISION_MODELS,
  ...ANTHROPIC_VISION_MODELS,
  ...GOOGLE_VISION_MODELS,
];

export const DEFAULT_VISION_MODEL_ID = "gpt-4o-vision";
