"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { computeWaveformPeaks, decodeAudioFile, detectBeatGrid } from "@/lib/audio";

export default function AudioPanel() {
  const audioFile = useEditorStore((s) => s.audioFile);
  const beatGrid = useEditorStore((s) => s.beatGrid);
  const isAnalyzing = useEditorStore((s) => s.isAnalyzingAudio);
  const setAudio = useEditorStore((s) => s.setAudio);
  const setAnalyzingAudio = useEditorStore((s) => s.setAnalyzingAudio);
  const setBeatGrid = useEditorStore((s) => s.setBeatGrid);
  const setWaveformPeaks = useEditorStore((s) => s.setWaveformPeaks);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setAudio(file);
    setAnalyzingAudio(true);
    try {
      const buffer = await decodeAudioFile(file);
      const [grid, peaks] = await Promise.all([
        detectBeatGrid(buffer),
        Promise.resolve(computeWaveformPeaks(buffer, 600)),
      ]);
      setBeatGrid(grid);
      setWaveformPeaks(peaks, buffer.duration);
    } catch (e) {
      console.error(e);
      setError("Couldn't analyze that track — try a different file (MP3/WAV/M4A).");
    } finally {
      setAnalyzingAudio(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Track</h2>
        {beatGrid && (
          <span className="font-mono text-xs text-pulse">{beatGrid.bpm} BPM</span>
        )}
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-dashed border-line px-4 py-4 text-center text-sm text-ink-dim transition-colors hover:border-pulse hover:text-ink"
      >
        {audioFile ? audioFile.name : "Choose a track (MP3, WAV, M4A)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {isAnalyzing && (
        <p className="font-mono text-xs text-ink-dim">Analyzing tempo…</p>
      )}
      {error && <p className="text-xs text-action">{error}</p>}
    </div>
  );
}
