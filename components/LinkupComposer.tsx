"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createLinkupAction } from "@/app/actions";

const VIBES = ["🎮", "🍢", "📚", "⚽", "🎬", "☕", "🎵", "🏀"];
const DURATIONS = [
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "4h", hours: 4 },
];

function PostButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Link Up"}
    </button>
  );
}

export default function LinkupComposer() {
  const [vibe, setVibe] = useState(VIBES[0]);
  const [hours, setHours] = useState(2);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        createLinkupAction(fd);
        formRef.current?.reset();
        setVibe(VIBES[0]);
        setHours(2);
      }}
      className="border-b border-border-soft px-4 py-4 sm:px-5"
    >
      <input
        name="activity"
        required
        placeholder="What's the move? e.g. FIFA, food run, movie night…"
        className="w-full bg-transparent text-[16px] text-text placeholder:text-text-faint focus:outline-none"
      />
      <input
        name="location"
        placeholder="Where? (optional)"
        className="mt-2 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {VIBES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVibe(v)}
              className={`grid h-8 w-8 place-items-center rounded-full text-base transition ${
                vibe === v ? "bg-accent-soft" : "hover:bg-surface-2"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <input type="hidden" name="vibe_emoji" value={vibe} />

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border border-border p-0.5 text-xs font-semibold">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                onClick={() => setHours(d.hours)}
                className={`rounded-full px-2.5 py-1 transition ${
                  hours === d.hours ? "bg-accent text-white" : "text-text-dim"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="hours" value={hours} />
          <PostButton />
        </div>
      </div>
    </form>
  );
}
