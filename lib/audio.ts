import { guess } from "web-audio-beat-detector";
import type { BeatGrid } from "./types";

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    void audioCtx.close();
  }
}

/**
 * BPM + full beat-time grid, extrapolated from a single detected
 * offset. Good approximation for steady-tempo tracks; tracks with
 * tempo changes will drift over long clips (P1 known limitation).
 */
export async function detectBeatGrid(
  audioBuffer: AudioBuffer
): Promise<BeatGrid> {
  const { bpm, offset } = await guess(audioBuffer);
  const secondsPerBeat = 60 / bpm;
  const duration = audioBuffer.duration;

  let t = offset;
  while (t > 0) t -= secondsPerBeat;
  t += secondsPerBeat;

  const beatTimes: number[] = [];
  for (; t < duration; t += secondsPerBeat) {
    beatTimes.push(Number(t.toFixed(4)));
  }

  return { bpm: Math.round(bpm * 10) / 10, beatTimes };
}

/**
 * Downsamples the audio to `bucketCount` peak-amplitude values
 * (0-1) for drawing a lightweight waveform, averaged across channels.
 */
export function computeWaveformPeaks(
  audioBuffer: AudioBuffer,
  bucketCount: number
): Float32Array {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const samplesPerBucket = Math.max(1, Math.floor(length / bucketCount));
  const peaks = new Float32Array(bucketCount);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  for (let b = 0; b < bucketCount; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, length);
    let peak = 0;
    for (let c = 0; c < channels; c++) {
      const data = channelData[c];
      for (let i = start; i < end; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }
    peaks[b] = peak;
  }

  return peaks;
}
