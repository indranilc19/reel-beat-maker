import AudioPanel from "@/components/AudioPanel";
import ControlsBar from "@/components/ControlsBar";
import PhotoPanel from "@/components/PhotoPanel";
import PreviewCanvas from "@/components/PreviewCanvas";
import WaveformTimeline from "@/components/WaveformTimeline";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line px-6 py-4">
        <h1 className="text-base font-medium text-ink">Reel Beat Maker</h1>
        <p className="text-xs text-ink-dim">
          Photos cut to the beat of the track you pick — export a vertical MP4 ready for Instagram.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
        <section className="flex flex-col gap-6 md:w-72 md:flex-shrink-0">
          <PhotoPanel />
          <AudioPanel />
        </section>

        <section className="flex flex-1 flex-col items-center justify-center gap-6">
          <PreviewCanvas />
          <div className="w-full max-w-xl">
            <WaveformTimeline />
          </div>
        </section>
      </main>

      <ControlsBar />
    </div>
  );
}
