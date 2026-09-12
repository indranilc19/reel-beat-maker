# Reel Beat Maker

Cut a set of photos to the beat of a track you choose, preview it, and export a vertical (1080×1920) MP4 sized for Instagram Reels/TikTok/Shorts.

## How it works
1. Add photos and a track (MP3/WAV/M4A) — everything runs client-side, nothing is uploaded anywhere.
2. The app decodes the audio, detects BPM + beat timestamps (`web-audio-beat-detector`), and builds a cut plan: which photo shows for how long, snapped to beat boundaries.
3. Pick a target length (15/30/60/90s) and cut density (every beat / every 2 beats / every bar).
4. Preview in the browser, then export — rendered with `ffmpeg.wasm` (concat demuxer + scale/pad to 1080x1920, muxed against the trimmed audio).

## Stack
Next.js (App Router) + TypeScript + Tailwind v4, Zustand for editor state, `web-audio-beat-detector` for tempo detection, `@ffmpeg/ffmpeg` (ffmpeg.wasm) for export.

## Known P1 limitations
- Beat grid is extrapolated from a single detected offset + BPM — tracks with tempo changes will drift over long clips.
- Export is a hard-cut concat; Ken Burns zoom and cross-fades are wired in `lib/ffmpegRender.ts` but not yet exposed in the UI.
- `ffmpeg.wasm` needs `SharedArrayBuffer`, so the app sets COOP/COEP headers in `next.config.ts` — required for both local dev and deployment.

## Local dev
```
npm install
npm run dev
```
