"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";

function slotAt(
  cutPlan: ReturnType<typeof useEditorStore.getState>["cutPlan"],
  t: number
) {
  for (const slot of cutPlan.slots) {
    if (t >= slot.start && t < slot.start + slot.duration) return slot;
  }
  return cutPlan.slots[cutPlan.slots.length - 1] ?? null;
}

export default function PreviewCanvas() {
  const photos = useEditorStore((s) => s.photos);
  const audioObjectUrl = useEditorStore((s) => s.audioObjectUrl);
  const cutPlan = useEditorStore((s) => s.cutPlan);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const playbackTime = useEditorStore((s) => s.playbackTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setPlaybackTime = useEditorStore((s) => s.setPlaybackTime);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);

  const ready = photos.length > 0 && cutPlan.slots.length > 0;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function tick() {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime - cutPlan.audioStartOffset;
    if (t >= cutPlan.totalDuration) {
      audio.pause();
      audio.currentTime = cutPlan.audioStartOffset;
      setPlaying(false);
      setPlaybackTime(0);
      return;
    }
    setPlaybackTime(t);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (isPlaying) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      if (playbackTime >= cutPlan.totalDuration - 0.02) {
        audio.currentTime = cutPlan.audioStartOffset;
        setPlaybackTime(0);
      } else {
        audio.currentTime = cutPlan.audioStartOffset + playbackTime;
      }
      await audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  const currentSlot = ready ? slotAt(cutPlan, playbackTime) : null;
  const currentPhoto =
    currentSlot != null ? photos[currentSlot.photoIndex] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-9/16 w-full max-w-[280px] overflow-hidden rounded-xl border border-line bg-panel">
        {currentPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentPhoto.id}
            src={currentPhoto.objectUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-dim">
            Add photos and a track to preview your reel
          </div>
        )}
        {ready && (
          <div className="absolute bottom-2 right-2 rounded bg-canvas/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim">
            {playbackTime.toFixed(1)}s / {cutPlan.totalDuration.toFixed(1)}s
          </div>
        )}
      </div>

      {audioObjectUrl && <audio ref={audioRef} src={audioObjectUrl} preload="auto" />}

      <button
        onClick={togglePlay}
        disabled={!ready}
        className="rounded-full bg-panel-raised px-5 py-2 text-sm font-medium text-ink transition-colors enabled:hover:bg-pulse enabled:hover:text-canvas disabled:opacity-40"
      >
        {isPlaying ? "Pause" : "Preview"}
      </button>
    </div>
  );
}
