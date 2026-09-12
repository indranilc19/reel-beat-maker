export type Density = "everyBeat" | "everyOtherBeat" | "everyBar";

export type TargetLength = 15 | 30 | 60 | 90;

export interface PhotoItem {
  id: string;
  file: File;
  objectUrl: string;
  /** Set once we've read the bitmap's natural size, for cover-fit math. */
  width?: number;
  height?: number;
}

export interface BeatGrid {
  bpm: number;
  /** Beat timestamps in seconds, offset already applied, covering the full track. */
  beatTimes: number[];
}

export interface CutSlot {
  photoIndex: number;
  /** Start time within the trimmed output, in seconds. */
  start: number;
  /** Duration of this slot, in seconds. */
  duration: number;
  /** True if this slot lands on what we think is a strong beat (bar start). */
  isDownbeat: boolean;
}

export interface CutPlan {
  slots: CutSlot[];
  totalDuration: number;
  audioStartOffset: number;
}

export type ExportStatus =
  | "idle"
  | "loading-ffmpeg"
  | "preparing-images"
  | "rendering"
  | "done"
  | "error";
