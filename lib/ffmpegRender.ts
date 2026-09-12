import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { CutPlan, PhotoItem } from "./types";

const CORE_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

let ffmpegSingleton: FFmpeg | null = null;

export async function getFfmpeg(
  onLog?: (message: string) => void
): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;

  const ffmpeg = new FFmpeg();
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${CORE_BASE_URL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  ffmpegSingleton = ffmpeg;
  return ffmpeg;
}

function extOf(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

export interface RenderOptions {
  photos: PhotoItem[];
  audioFile: File;
  cutPlan: CutPlan;
  /** Ken Burns-style slow zoom on each photo. Off by default for P1 speed. */
  kenBurns?: boolean;
  onProgress?: (ratio: number) => void;
}

/**
 * Renders the cut plan to a vertical (1080x1920) H.264/AAC MP4 using
 * ffmpeg.wasm's concat demuxer for the image sequence, muxed against
 * the trimmed source audio.
 */
export async function renderReel({
  photos,
  audioFile,
  cutPlan,
  kenBurns = false,
  onProgress,
}: RenderOptions): Promise<Blob> {
  if (cutPlan.slots.length === 0) {
    throw new Error("No cut plan to render — add photos and pick a track first.");
  }

  const ffmpeg = await getFfmpeg();
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => onProgress(Math.min(progress, 1))
    : null;

  if (progressHandler) ffmpeg.on("progress", progressHandler);

  const usedIndices = Array.from(new Set(cutPlan.slots.map((s) => s.photoIndex)));
  const extByIndex = new Map<number, string>();
  const createdFiles: string[] = [];

  try {
    for (const idx of usedIndices) {
      const photo = photos[idx];
      if (!photo) throw new Error(`Photo ${idx + 1} is missing from the project.`);
      const ext = extOf(photo.file);
      extByIndex.set(idx, ext);
      const filename = `img${idx}.${ext}`;
      await ffmpeg.writeFile(filename, await fetchFile(photo.file));
      createdFiles.push(filename);
    }

    const lines: string[] = [];
    for (const slot of cutPlan.slots) {
      const ext = extByIndex.get(slot.photoIndex);
      if (!ext) throw new Error("Invalid cut plan: photo extension is missing.");
      lines.push(`file 'img${slot.photoIndex}.${ext}'`);
      lines.push(`duration ${slot.duration.toFixed(3)}`);
    }
    const lastSlot = cutPlan.slots[cutPlan.slots.length - 1];
    const lastExt = extByIndex.get(lastSlot.photoIndex);
    if (!lastExt) throw new Error("Invalid cut plan: last photo is missing.");
    lines.push(`file 'img${lastSlot.photoIndex}.${lastExt}'`);
    await ffmpeg.writeFile("list.txt", lines.join("\n"));
    createdFiles.push("list.txt");

    const audioExt = extOf(audioFile);
    const audioFilename = `audio.${audioExt}`;
    await ffmpeg.writeFile(audioFilename, await fetchFile(audioFile));
    createdFiles.push(audioFilename);

    const vf = kenBurns
      ? "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
        "zoompan=z='min(zoom+0.0006,1.08)':d=125:s=1080x1920:fps=30,setsar=1"
      : "scale=1080:1920:force_original_aspect_ratio=decrease," +
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1";

    const args = [
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-ss", cutPlan.audioStartOffset.toFixed(3),
      "-t", cutPlan.totalDuration.toFixed(3),
      "-i", audioFilename,
      "-vf", vf,
      "-r", "30",
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      "output.mp4",
    ];

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile("output.mp4");
    if (typeof data === "string") {
      throw new Error("FFmpeg returned an invalid video result.");
    }

    const bytes = data as Uint8Array;
    // Copy into a real ArrayBuffer. This avoids the TS 5.x ArrayBufferLike
    // generic incompatibility when passing FFmpeg's Uint8Array to Blob.
    const blobBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(blobBuffer).set(bytes);
    return new Blob([blobBuffer], { type: "video/mp4" });
  } finally {
    for (const filename of [...createdFiles, "output.mp4"]) {
      await ffmpeg.deleteFile(filename).catch(() => {});
    }
    if (progressHandler) ffmpeg.off("progress", progressHandler);
  }
}
