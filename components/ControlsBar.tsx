"use client";

import { useEditorStore } from "@/store/editorStore";
import { renderReel } from "@/lib/ffmpegRender";
import type { Density, TargetLength } from "@/lib/types";

const LENGTHS: TargetLength[] = [15, 30, 60, 90];
const DENSITIES: { value: Density; label: string }[] = [
  { value: "everyBeat", label: "Every beat" },
  { value: "everyOtherBeat", label: "Every 2 beats" },
  { value: "everyBar", label: "Every bar" },
];

export default function ControlsBar() {
  const targetLength = useEditorStore((s) => s.targetLength);
  const density = useEditorStore((s) => s.density);
  const setTargetLength = useEditorStore((s) => s.setTargetLength);
  const setDensity = useEditorStore((s) => s.setDensity);
  const photos = useEditorStore((s) => s.photos);
  const audioFile = useEditorStore((s) => s.audioFile);
  const cutPlan = useEditorStore((s) => s.cutPlan);
  const exportStatus = useEditorStore((s) => s.exportStatus);
  const exportProgress = useEditorStore((s) => s.exportProgress);
  const exportError = useEditorStore((s) => s.exportError);
  const exportedVideoUrl = useEditorStore((s) => s.exportedVideoUrl);
  const setExportStatus = useEditorStore((s) => s.setExportStatus);
  const setExportError = useEditorStore((s) => s.setExportError);
  const setExportedVideoUrl = useEditorStore((s) => s.setExportedVideoUrl);

  const canExport = photos.length > 0 && audioFile && cutPlan.slots.length > 0;
  const isRendering =
    exportStatus === "loading-ffmpeg" || exportStatus === "rendering";

  async function handleExport() {
    if (!canExport || !audioFile) return;
    setExportError(null);
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
      setExportedVideoUrl(null);
    }
    try {
      setExportStatus("loading-ffmpeg", 0);
      const blob = await renderReel({
        photos,
        audioFile,
        cutPlan,
        onProgress: (ratio) => setExportStatus("rendering", ratio),
      });
      setExportedVideoUrl(URL.createObjectURL(blob));
      setExportStatus("done", 1);
    } catch (e) {
      console.error(e);
      setExportError(
        e instanceof Error ? e.message : "Export failed — try again."
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-dim">Length</span>
          <div className="flex overflow-hidden rounded-md border border-line">
            {LENGTHS.map((len) => (
              <button
                key={len}
                onClick={() => setTargetLength(len)}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  targetLength === len
                    ? "bg-pulse text-canvas"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                {len}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-dim">Cut on</span>
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as Density)}
            className="rounded-md border border-line bg-panel-raised px-2 py-1.5 text-xs text-ink"
          >
            {DENSITIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={!canExport || isRendering}
          className="ml-auto rounded-full bg-action px-5 py-2 text-sm font-medium text-canvas transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
        >
          {isRendering
            ? `Rendering… ${Math.round(exportProgress * 100)}%`
            : "Export MP4"}
        </button>
      </div>

      {exportError && <p className="text-xs text-action">{exportError}</p>}

      {exportedVideoUrl && exportStatus === "done" && (
        <a
          href={exportedVideoUrl}
          download="reel.mp4"
          className="self-start rounded-full border border-pulse px-4 py-1.5 text-xs font-medium text-pulse transition-colors hover:bg-pulse hover:text-canvas"
        >
          Download reel.mp4
        </a>
      )}
    </div>
  );
}
