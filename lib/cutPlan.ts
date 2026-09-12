import type { BeatGrid, CutPlan, CutSlot, Density, TargetLength } from "./types";

const STRIDE: Record<Density, number> = {
  everyBeat: 1,
  everyOtherBeat: 2,
  everyBar: 4, // assumes 4/4, true for the vast majority of pop/EDM/hip-hop
};

/**
 * Builds a cut plan: a sequence of {photo, start, duration} slots that
 * land on beat boundaries, trimmed to targetLength seconds, cycling
 * through the supplied photos in order.
 *
 * The plan's own timeline starts at 0 — `audioStartOffset` tells the
 * renderer/player where to start reading from the source audio so
 * slot 0 lines up with a real beat instead of dead air before it.
 */
export function buildCutPlan(
  beatGrid: BeatGrid,
  photoCount: number,
  targetLength: TargetLength,
  density: Density
): CutPlan {
  if (photoCount === 0 || beatGrid.beatTimes.length < 2) {
    return { slots: [], totalDuration: 0, audioStartOffset: 0 };
  }

  const stride = STRIDE[density];
  const audioStartOffset = beatGrid.beatTimes[0];

  // Beat indices we'll actually cut on, relative to beatTimes[0].
  const cutBeats = beatGrid.beatTimes.filter(
    (_, i) => i % stride === 0
  );

  const slots: CutSlot[] = [];
  let elapsed = 0;
  let photoIndex = 0;
  let beatCursor = 0;

  while (elapsed < targetLength && beatCursor < cutBeats.length - 1) {
    const start = cutBeats[beatCursor] - audioStartOffset;
    const next = cutBeats[beatCursor + 1] - audioStartOffset;
    let duration = next - start;

    if (elapsed + duration > targetLength) {
      duration = targetLength - elapsed;
    }
    if (duration <= 0.05) break;

    const bpmBasedBeatIndex = beatCursor * stride;
    slots.push({
      photoIndex: photoIndex % photoCount,
      start: elapsed,
      duration,
      isDownbeat: bpmBasedBeatIndex % 4 === 0,
    });

    elapsed += duration;
    photoIndex += 1;
    beatCursor += 1;
  }

  return { slots, totalDuration: elapsed, audioStartOffset };
}
