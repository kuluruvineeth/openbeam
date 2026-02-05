import type { ImageModel } from "./types";

export const OPENAI_IMAGE_MODELS: ImageModel[] = [
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    maxResolution: "1792x1024",
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsVariations: true,
    supportsStyle: true,
    supportsQuality: true,
    pricing: { perImage: 0.04 },
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    maxResolution: "2048x2048",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    pricing: { perImage: 0.02 },
  },
];

export const STABILITY_IMAGE_MODELS: ImageModel[] = [
  {
    id: "sd3.5-large",
    name: "Stable Diffusion 3.5 Large",
    provider: "stability",
    maxResolution: "2048x2048",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    isLocal: true,
    pricing: { perImage: 0.0 },
  },
  {
    id: "sd3.5-large-turbo",
    name: "Stable Diffusion 3.5 Large Turbo",
    provider: "stability",
    maxResolution: "1024x1024",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    isLocal: true,
    pricing: { perImage: 0.0 },
  },
  {
    id: "sdxl-turbo",
    name: "SDXL Turbo",
    provider: "stability",
    maxResolution: "1024x1024",
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsVariations: false,
    isLocal: true,
    pricing: { perImage: 0.0 },
  },
];

export const BLACKFORESTLABS_IMAGE_MODELS: ImageModel[] = [
  {
    id: "flux-1.1-pro",
    name: "FLUX 1.1 Pro",
    provider: "blackforestlabs",
    maxResolution: "2048x2048",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    pricing: { perImage: 0.04 },
  },
  {
    id: "flux-1.1-pro-ultra",
    name: "FLUX 1.1 Pro Ultra",
    provider: "blackforestlabs",
    maxResolution: "4096x4096",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    pricing: { perImage: 0.06 },
  },
  {
    id: "flux-schnell",
    name: "FLUX Schnell",
    provider: "blackforestlabs",
    maxResolution: "1024x1024",
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsVariations: false,
    isLocal: true,
    pricing: { perImage: 0.0 },
  },
  {
    id: "flux-kontext",
    name: "FLUX Kontext",
    provider: "blackforestlabs",
    maxResolution: "2048x2048",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    pricing: { perImage: 0.04 },
  },
];

export const GOOGLE_IMAGE_MODELS: ImageModel[] = [
  {
    id: "imagen-3",
    name: "Google Imagen 3",
    provider: "google",
    maxResolution: "2048x2048",
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsVariations: true,
    pricing: { perImage: 0.03 },
  },
];

export const IMAGE_MODELS: ImageModel[] = [
  ...OPENAI_IMAGE_MODELS,
  ...STABILITY_IMAGE_MODELS,
  ...BLACKFORESTLABS_IMAGE_MODELS,
  ...GOOGLE_IMAGE_MODELS,
];

export const DEFAULT_IMAGE_MODEL_ID = "dall-e-3";
