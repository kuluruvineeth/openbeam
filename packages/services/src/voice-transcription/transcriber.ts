import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";

interface TranscriptionResult {
  text: string;
  language?: string;
  durationSeconds?: number;
}

const MIN_DURATION_SECONDS = 1;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function createGroqProvider() {
  if (!GROQ_API_KEY) {
    return null;
  }
  return createOpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function createOpenAIProvider() {
  if (!OPENAI_API_KEY) {
    return null;
  }
  return createOpenAI({ apiKey: OPENAI_API_KEY });
}

export async function transcribeVoiceNote(
  buffer: Buffer,
  _mimeType?: string,
  options?: { duration?: number }
): Promise<TranscriptionResult> {
  if (
    options?.duration !== undefined &&
    options.duration < MIN_DURATION_SECONDS
  ) {
    return { text: "" };
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(
      `Audio file too large: ${buffer.byteLength} bytes (max ${MAX_FILE_SIZE})`
    );
  }

  const groq = createGroqProvider();
  if (groq) {
    try {
      return await runTranscription(groq, "whisper-large-v3-turbo", buffer);
    } catch {
      // fall through to OpenAI
    }
  }

  const openai = createOpenAIProvider();
  if (openai) {
    return runTranscription(openai, "whisper-1", buffer);
  }

  throw new Error(
    "No transcription provider configured (GROQ_API_KEY or OPENAI_API_KEY required)"
  );
}

async function runTranscription(
  provider: ReturnType<typeof createOpenAI>,
  modelId: string,
  buffer: Buffer
): Promise<TranscriptionResult> {
  const result = await transcribe({
    model: provider.transcription(modelId),
    audio: buffer,
  });

  return {
    text: result.text.trim(),
    language: result.language ?? undefined,
    durationSeconds: result.durationInSeconds ?? undefined,
  };
}
