"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";

export default function WaveformTimeline() {
  const waveformPeaks = useEditorStore((s) => s.waveformPeaks);
  const audioDuration = useEditorStore((s) => s.audioDuration);
  const beatGrid = useEditorStore((s) => s.beatGrid);
  const cutPlan = useEditorStore((s) => s.cutPlan);
  const playbackTime = useEditorStore((s) => s.playbackTime);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformPeaks || !audioDuration || cutPlan.totalDuration === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const windowStart = cutPlan.audioStartOffset;
    const windowEnd = windowStart + cutPlan.totalDuration;
    const bucketDuration = audioDuration / waveformPeaks.length;
    const startBucket = Math.floor(windowStart / bucketDuration);
    const endBucket = Math.ceil(windowEnd / bucketDuration);
    const visibleBuckets = Math.max(1, endBucket - startBucket);

    const mid = cssHeight * 0.55;
    const maxBarHeight = cssHeight * 0.7;
    const barWidth = cssWidth / visibleBuckets;

    ctx.fillStyle = "#3a3b47";
    for (let i = 0; i < visibleBuckets; i++) {
      const peak = waveformPeaks[startBucket + i] ?? 0;
      const h = Math.max(1.5, peak * maxBarHeight);
      const x = i * barWidth;
      ctx.fillRect(x, mid - h / 2, Math.max(1, barWidth - 0.5), h);
    }

    // Beat ticks, drawn above the waveform baseline.
    if (beatGrid) {
      for (let i = 0; i < beatGrid.beatTimes.length; i++) {
        const bt = beatGrid.beatTimes[i];
        if (bt < windowStart || bt > windowEnd) continue;
        const x = ((bt - windowStart) / cutPlan.totalDuration) * cssWidth;
        const isDownbeat = i % 4 === 0;
        ctx.fillStyle = isDownbeat ? "#c8ff4d" : "#c8ff4d99";
        const tickHeight = isDownbeat ? 14 : 8;
        ctx.fillRect(x, cssHeight - tickHeight, 1.5, tickHeight);
      }
    }

    // Playhead.
    if (playbackTime >= 0) {
      const x = (playbackTime / cutPlan.totalDuration) * cssWidth;
      ctx.fillStyle = "#ff6b4a";
      ctx.fillRect(x, 0, 1.5, cssHeight);
    }
  }, [waveformPeaks, audioDuration, beatGrid, cutPlan, playbackTime]);

  if (!waveformPeaks) {
    return (
      <div className="flex h-16 items-center justify-center rounded-md border border-line text-xs text-ink-dim">
        Waveform + beat markers appear once you add a track
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <canvas ref={canvasRef} className="h-16 w-full rounded-md border border-line" />
      <div className="flex justify-between font-mono text-[10px] text-ink-dim">
        <span>0:00</span>
        <span>{beatGrid ? `${beatGrid.bpm} BPM` : ""}</span>
        <span>
          {Math.floor(cutPlan.totalDuration / 60)}:
          {String(Math.round(cutPlan.totalDuration % 60)).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
