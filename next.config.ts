import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Required so ffmpeg.wasm can use SharedArrayBuffer for the
        // multi-threaded core. Without these, export falls back to a
        // much slower single-threaded path (or fails on some builds).
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
