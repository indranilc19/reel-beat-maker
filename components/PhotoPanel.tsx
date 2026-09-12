"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import type { PhotoItem } from "@/lib/types";

export default function PhotoPanel() {
  const photos = useEditorStore((s) => s.photos);
  const addPhotos = useEditorStore((s) => s.addPhotos);
  const removePhoto = useEditorStore((s) => s.removePhoto);
  const reorderPhotos = useEditorStore((s) => s.reorderPhotos);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const items: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        objectUrl: URL.createObjectURL(file),
      }));
    if (items.length) addPhotos(items);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Photos</h2>
        <span className="font-mono text-xs text-ink-dim">{photos.length}</span>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-ink-dim transition-colors hover:border-pulse hover:text-ink"
      >
        Drop photos here, or click to choose
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) reorderPhotos(dragIndex, i);
                setDragIndex(null);
              }}
              className="group relative h-20 w-20 flex-shrink-0 cursor-grab overflow-hidden rounded-md border border-line active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.objectUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0.5 left-1 font-mono text-[10px] text-ink/80">
                {i + 1}
              </span>
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-canvas/90 text-[10px] leading-none text-ink group-hover:flex"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
