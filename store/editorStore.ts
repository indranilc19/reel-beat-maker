import { create } from "zustand";
import type {
  BeatGrid,
  CutPlan,
  Density,
  ExportStatus,
  PhotoItem,
  TargetLength,
} from "@/lib/types";
import { buildCutPlan } from "@/lib/cutPlan";

interface EditorState {
  photos: PhotoItem[];
  audioFile: File | null;
  audioObjectUrl: string | null;
  beatGrid: BeatGrid | null;
  waveformPeaks: Float32Array | null;
  audioDuration: number | null;
  targetLength: TargetLength;
  density: Density;
  cutPlan: CutPlan;
  isAnalyzingAudio: boolean;
  exportStatus: ExportStatus;
  exportProgress: number; // 0-1
  exportError: string | null;
  exportedVideoUrl: string | null;
  isPlaying: boolean;
  playbackTime: number; // seconds, relative to the trimmed timeline (0..totalDuration)

  addPhotos: (photos: PhotoItem[]) => void;
  removePhoto: (id: string) => void;
  reorderPhotos: (from: number, to: number) => void;
  setAudio: (file: File) => void;
  setAnalyzingAudio: (v: boolean) => void;
  setBeatGrid: (grid: BeatGrid) => void;
  setWaveformPeaks: (peaks: Float32Array, duration: number) => void;
  setTargetLength: (len: TargetLength) => void;
  setDensity: (d: Density) => void;
  setExportStatus: (s: ExportStatus, progress?: number) => void;
  setExportError: (msg: string | null) => void;
  setExportedVideoUrl: (url: string | null) => void;
  setPlaying: (v: boolean) => void;
  setPlaybackTime: (t: number) => void;
  recomputeCutPlan: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  photos: [],
  audioFile: null,
  audioObjectUrl: null,
  beatGrid: null,
  waveformPeaks: null,
  audioDuration: null,
  targetLength: 30,
  density: "everyBeat",
  cutPlan: { slots: [], totalDuration: 0, audioStartOffset: 0 },
  isAnalyzingAudio: false,
  exportStatus: "idle",
  exportProgress: 0,
  exportError: null,
  exportedVideoUrl: null,
  isPlaying: false,
  playbackTime: 0,

  addPhotos: (photos) => {
    set((state) => ({ photos: [...state.photos, ...photos] }));
    get().recomputeCutPlan();
  },

  removePhoto: (id) => {
    set((state) => {
      const target = state.photos.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return { photos: state.photos.filter((p) => p.id !== id) };
    });
    get().recomputeCutPlan();
  },

  reorderPhotos: (from, to) => {
    set((state) => {
      const next = [...state.photos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { photos: next };
    });
    get().recomputeCutPlan();
  },

  setAudio: (file) => {
    const prev = get().audioObjectUrl;
    if (prev) URL.revokeObjectURL(prev);
    const previousVideoUrl = get().exportedVideoUrl;
    if (previousVideoUrl) URL.revokeObjectURL(previousVideoUrl);
    set({
      audioFile: file,
      audioObjectUrl: URL.createObjectURL(file),
      beatGrid: null,
      waveformPeaks: null,
      audioDuration: null,
      cutPlan: { slots: [], totalDuration: 0, audioStartOffset: 0 },
      isPlaying: false,
      playbackTime: 0,
      exportStatus: "idle",
      exportProgress: 0,
      exportError: null,
      exportedVideoUrl: null,
    });
  },

  setAnalyzingAudio: (v) => set({ isAnalyzingAudio: v }),

  setBeatGrid: (grid) => {
    set({ beatGrid: grid });
    get().recomputeCutPlan();
  },

  setWaveformPeaks: (peaks, duration) =>
    set({ waveformPeaks: peaks, audioDuration: duration }),

  setTargetLength: (len) => {
    set({ targetLength: len });
    get().recomputeCutPlan();
  },

  setDensity: (d) => {
    set({ density: d });
    get().recomputeCutPlan();
  },

  setExportStatus: (s, progress = 0) =>
    set({ exportStatus: s, exportProgress: progress }),
  setExportError: (msg) => set({ exportError: msg, exportStatus: "error" }),
  setExportedVideoUrl: (url) => set({ exportedVideoUrl: url }),
  setPlaying: (v) => set({ isPlaying: v }),
  setPlaybackTime: (t) => set({ playbackTime: t }),

  recomputeCutPlan: () => {
    const { beatGrid, photos, targetLength, density } = get();
    if (!beatGrid || photos.length === 0) {
      set({ cutPlan: { slots: [], totalDuration: 0, audioStartOffset: 0 } });
      return;
    }
    set({
      cutPlan: buildCutPlan(beatGrid, photos.length, targetLength, density),
    });
  },
}));
