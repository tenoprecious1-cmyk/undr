"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPostAction } from "@/app/actions";
import type { Profile } from "@/lib/types";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

type PickedImage = { file: File; url: string };

function DropButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
    >
      {pending ? "Dropping…" : "DROP"}
    </button>
  );
}

export default function Composer({
  profile,
  parentId,
  redirectTo,
  placeholder = "What's the gist? 👀",
  compact = false,
  defaultCategory = "gist",
}: {
  profile: Profile;
  parentId?: string;
  redirectTo?: string;
  placeholder?: string;
  compact?: boolean;
  defaultCategory?: "gist" | "chaos";
}) {
  const [category, setCategory] = useState<"gist" | "chaos">(defaultCategory);
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const pollValue = options.map((o) => o.trim()).filter(Boolean).join("|");
  const hasMedia = images.length > 0 || !!video;

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (video) URL.revokeObjectURL(video.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncImageInput(next: PickedImage[]) {
    if (!imageInputRef.current) return;
    const dt = new DataTransfer();
    next.forEach((img) => dt.items.add(img.file));
    imageInputRef.current.files = dt.files;
  }

  function onPickImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setMediaError(null);
    if (video) {
      setMediaError("Remove the video first — one post can have images or a video, not both.");
      return;
    }
    const picked = Array.from(fileList);
    const valid: PickedImage[] = [];
    for (const file of picked) {
      if (!IMAGE_TYPES.includes(file.type)) {
        setMediaError("Only JPG, PNG, WEBP, or GIF images are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setMediaError("Each image must be under 8MB.");
        continue;
      }
      valid.push({ file, url: URL.createObjectURL(file) });
    }
    const next = [...images, ...valid].slice(0, MAX_IMAGES);
    if (images.length + valid.length > MAX_IMAGES) {
      setMediaError(`You can attach up to ${MAX_IMAGES} images.`);
    }
    setImages(next);
    syncImageInput(next);
    if (next.length > 0) {
      setPollOpen(false);
      setOptions(["", ""]);
    }
  }

  function removeImage(index: number) {
    const img = images[index];
    URL.revokeObjectURL(img.url);
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    syncImageInput(next);
  }

  function onPickVideo(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setMediaError(null);
    if (images.length > 0) {
      setMediaError("Remove the images first — one post can have images or a video, not both.");
      return;
    }
    if (!VIDEO_TYPES.includes(file.type)) {
      setMediaError("Only MP4, WebM, or MOV videos are supported.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setMediaError("Video must be under 50MB.");
      return;
    }
    if (video) URL.revokeObjectURL(video.url);
    setVideo({ file, url: URL.createObjectURL(file) });
    setPollOpen(false);
    setOptions(["", ""]);
  }

  function removeVideo() {
    if (!video) return;
    URL.revokeObjectURL(video.url);
    setVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function resetMedia() {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    if (video) URL.revokeObjectURL(video.url);
    setImages([]);
    setVideo(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        createPostAction(fd);
        setOptions(["", ""]);
        setPollOpen(false);
        setCategory(defaultCategory);
        resetMedia();
      }}
      className={`flex gap-3 border-b border-border-soft px-4 py-4 sm:px-5 ${compact ? "" : ""}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
        {profile.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <textarea
          name="content"
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none"
        />

        {images.length > 0 && (
          <div className={`mb-3 grid gap-1.5 overflow-hidden rounded-2xl ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.map((img, i) => (
              <div key={img.url} className="group relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white backdrop-blur transition hover:bg-black/90"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {video && (
          <div className="group relative mb-3 overflow-hidden rounded-2xl">
            <video src={video.url} controls className="max-h-80 w-full bg-black" />
            <button
              type="button"
              onClick={removeVideo}
              aria-label="Remove video"
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white backdrop-blur transition hover:bg-black/90"
            >
              ✕
            </button>
          </div>
        )}

        {mediaError && <p className="mb-2 text-xs font-medium text-red-400">{mediaError}</p>}

        <input
          ref={imageInputRef}
          type="file"
          name="images"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => onPickImages(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          name="video"
          accept={VIDEO_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onPickVideo(e.target.files)}
        />

        {pollOpen && (
          <div className="mb-3 flex flex-col gap-2">
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                maxLength={60}
                className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            ))}
            <div className="flex items-center gap-3">
              {options.length < 4 && (
                <button
                  type="button"
                  onClick={() => setOptions([...options, ""])}
                  className="text-xs font-semibold text-accent-2 hover:underline"
                >
                  + Add option
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPollOpen(false);
                  setOptions(["", ""]);
                }}
                className="text-xs font-semibold text-text-faint hover:text-text"
              >
                Remove poll
              </button>
            </div>
          </div>
        )}

        <input type="hidden" name="poll_options" value={pollOpen ? pollValue : ""} />
        <input type="hidden" name="category" value={category} />
        {parentId && <input type="hidden" name="parent_id" value={parentId} />}
        {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={pollOpen || !!video || images.length >= MAX_IMAGES}
              title="Add images"
              className="grid h-8 w-8 place-items-center rounded-full text-base text-text-dim transition hover:bg-accent-soft disabled:opacity-30"
            >
              🖼️
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={pollOpen || images.length > 0 || !!video}
              title="Add video"
              className="grid h-8 w-8 place-items-center rounded-full text-base text-text-dim transition hover:bg-accent-soft disabled:opacity-30"
            >
              🎥
            </button>
            <button
              type="button"
              onClick={() => setPollOpen((v) => !v)}
              disabled={hasMedia}
              title="Poll"
              className={`grid h-8 w-8 place-items-center rounded-full text-base transition hover:bg-accent-soft disabled:opacity-30 ${
                pollOpen ? "bg-accent-soft text-accent-2" : "text-text-dim"
              }`}
            >
              📊
            </button>
            <div className="ml-2 flex rounded-full border border-border p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCategory("gist")}
                className={`rounded-full px-3 py-1 transition ${
                  category === "gist" ? "bg-accent text-white" : "text-text-dim"
                }`}
              >
                Gist
              </button>
              <button
                type="button"
                onClick={() => setCategory("chaos")}
                className={`rounded-full px-3 py-1 transition ${
                  category === "chaos" ? "bg-chaos text-white" : "text-text-dim"
                }`}
              >
                Chaos 😂
              </button>
            </div>
          </div>
          <DropButton />
        </div>
      </div>
    </form>
  );
}
