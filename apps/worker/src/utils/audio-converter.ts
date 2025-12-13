import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FILE_EXTENSION_REGEX = /\.[^.]+$/;

const FFMPEG_ARGS = [
  "-f",
  "lavfi",
  "-i",
  "color=c=black:s=640x360:r=1",
  "-shortest",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-tune",
  "stillimage",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
];

export async function convertAudioToVideo(
  audioBuffer: Buffer<ArrayBufferLike>,
  inputExtension: string
): Promise<Buffer> {
  const workDir = join(tmpdir(), `audio-convert-${randomUUID()}`);
  const inputPath = join(workDir, `input${inputExtension}`);
  const outputPath = join(workDir, "output.mp4");

  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(inputPath, audioBuffer);

    await runFFmpeg(["-i", inputPath, ...FFMPEG_ARGS, outputPath]);

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...args,
    ]);

    let stderr = "";
    process.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    process.on("error", reject);
  });
}

export function getFileExtension(fileName: string): string {
  const match = fileName.match(FILE_EXTENSION_REGEX);
  return match ? match[0] : "";
}

interface PreparedMedia {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export async function prepareAudioAsVideo(
  audioBuffer: Buffer<ArrayBufferLike>,
  originalFileName: string
): Promise<PreparedMedia> {
  const extension = getFileExtension(originalFileName);
  const buffer = await convertAudioToVideo(audioBuffer, extension);
  const baseName = extension
    ? originalFileName.slice(0, -extension.length)
    : originalFileName;

  return { buffer, mimeType: "video/mp4", fileName: `${baseName}.mp4` };
}
