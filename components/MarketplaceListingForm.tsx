"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createMarketplaceListingAction } from "@/app/actions";
import { MARKETPLACE_CATEGORY_LABELS } from "@/lib/types";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PickedImage = { file: File; url: string };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Listing it…" : "List it"}
    </button>
  );
}

export default function MarketplaceListingForm() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const valid = title.trim().length > 0 && Number(price) > 0;

  function syncImageInput(next: PickedImage[]) {
    if (!imageInputRef.current) return;
    const dt = new DataTransfer();
    next.forEach((img) => dt.items.add(img.file));
    imageInputRef.current.files = dt.files;
  }

  function onPickImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setMediaError(null);
    const picked = Array.from(fileList);
    const valid: PickedImage[] = [];
    for (const file of picked) {
      if (!IMAGE_TYPES.includes(file.type)) {
        setMediaError("Only JPG, PNG, WEBP, or GIF images are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setMediaError("Each photo must be under 8MB.");
        continue;
      }
      valid.push({ file, url: URL.createObjectURL(file) });
    }
    const next = [...images, ...valid].slice(0, MAX_IMAGES);
    if (images.length + valid.length > MAX_IMAGES) {
      setMediaError(`You can add up to ${MAX_IMAGES} photos.`);
    }
    setImages(next);
    syncImageInput(next);
  }

  function removeImage(index: number) {
    const img = images[index];
    URL.revokeObjectURL(img.url);
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    syncImageInput(next);
  }

  return (
    <form action={createMarketplaceListingAction} className="flex flex-col gap-4 px-4 py-5 sm:px-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Photos</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img.url} className="group relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="grid aspect-square place-items-center rounded-xl border border-dashed border-border-soft text-2xl text-text-faint hover:bg-surface-2/60"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          name="images"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => onPickImages(e.target.files)}
        />
        {mediaError && <p className="mt-1.5 text-xs font-medium text-danger">{mediaError}</p>}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Title</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. TI-84 calculator, barely used"
          className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Price (₦)</label>
          <input
            name="price"
            type="number"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="5000"
            className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Category</label>
          <select
            name="category"
            defaultValue="other"
            className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text focus:border-accent focus:outline-none"
          >
            {Object.entries(MARKETPLACE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Condition</label>
        <div className="mt-1.5 flex gap-2">
          {(["new", "used"] as const).map((c) => (
            <label
              key={c}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border-soft bg-surface/60 py-2.5 text-sm capitalize text-text-dim transition [&:has(:checked)]:border-accent [&:has(:checked)]:text-text [&:has(:checked)]:bg-accent-soft"
            >
              <input type="radio" name="condition" value={c} className="hidden" defaultChecked={c === "used"} />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Description</label>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Condition, why you're selling, anything a buyer should know…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => setContactOpen((v) => !v)}
        className="flex items-center gap-1.5 self-start text-xs font-semibold text-accent-2"
      >
        {contactOpen ? "− Hide contact info" : "+ Add contact info (optional)"}
      </button>

      {contactOpen && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface/40 p-3.5">
          <p className="text-xs text-text-faint">
            Still anonymous by default — only add these if you want buyers to be able to reach you outside UNDR to
            arrange handoff.
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">WhatsApp number</label>
            <input
              name="contact_whatsapp"
              placeholder="e.g. 0801 234 5678"
              maxLength={40}
              className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Meetup spot</label>
            <input
              name="contact_meetup"
              placeholder="e.g. Behind the library, weekdays after 4pm"
              maxLength={120}
              className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      <SubmitButton disabled={!valid} />
    </form>
  );
}
