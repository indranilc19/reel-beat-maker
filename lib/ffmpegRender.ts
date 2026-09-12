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
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(Math.min(progress, 1)));
  }

  // Write each unique photo once.
  const usedIndices = Array.from(new Set(cutPlan.slots.map((s) => s.photoIndex)));
  const extByIndex = new Map<number, string>();
  for (const idx of usedIndices) {
    const photo = photos[idx];
    const ext = extOf(photo.file);
    extByIndex.set(idx, ext);
    await ffmpeg.writeFile(`img${idx}.${ext}`, await fetchFile(photo.file));
  }

  // Build the concat demuxer script. ffmpeg's concat demuxer ignores
  // the duration on the final entry, so we repeat the last file with
  // no duration line as the docs recommend.
  const lines: string[] = [];
  for (const slot of cutPlan.slots) {
    const ext = extByIndex.get(slot.photoIndex);
    lines.push(`file 'img${slot.photoIndex}.${ext}'`);
    lines.push(`duration ${slot.duration.toFixed(3)}`);
  }
  const lastSlot = cutPlan.slots[cutPlan.slots.length - 1];
  lines.push(`file 'img${lastSlot.photoIndex}.${extByIndex.get(lastSlot.photoIndex)}'`);
  await ffmpeg.writeFile("list.txt", lines.join("\n"));

  const audioExt = extOf(audioFile);
  await ffmpeg.writeFile(`audio.${audioExt}`, await fetchFile(audioFile));

  const vf = kenBurns
    ? // gentle 1.0x -> 1.08x zoom per slot, cover-fit into the frame first
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
      "zoompan=z='min(zoom+0.0006,1.08)':d=125:s=1080x1920:fps=30,setsar=1"
    : "scale=1080:1920:force_original_aspect_ratio=decrease," +
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1";

  const args = [
    "-f", "concat",
    "-safe", "0",
    "-i", "list.txt",
    "-ss", cutPlan.audioStartOffset.toFixed(3),
    "-t", cutPlan.totalDuration.toFixed(3),
    "-i", `audio.${audioExt}`,
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
  const bytes = data as Uint8Array;

  // Clean up FS for the next render.
  for (const idx of usedIndices) {
    await ffmpeg.deleteFile(`img${idx}.${extByIndex.get(idx)}`).catch(() => {});
  }
  await ffmpeg.deleteFile("list.txt").catch(() => {});
  await ffmpeg.deleteFile(`audio.${audioExt}`).catch(() => {});
  await ffmpeg.deleteFile("output.mp4").catch(() => {});

  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
}
