"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPostAction } from "@/app/actions";
import type { Profile } from "@/lib/types";

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
  const formRef = useRef<HTMLFormElement>(null);

  const pollValue = options.map((o) => o.trim()).filter(Boolean).join("|");

  return (
    <form
      ref={formRef}
      action={(fd) => {
        createPostAction(fd);
        setOptions(["", ""]);
        setPollOpen(false);
        setCategory(defaultCategory);
      }}
      className={`flex gap-3 border-b border-border-soft px-4 py-4 sm:px-5 ${compact ? "" : ""}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
        {profile.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <textarea
          name="content"
          required
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none"
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
              onClick={() => setPollOpen((v) => !v)}
              title="Poll"
              className={`grid h-8 w-8 place-items-center rounded-full text-base transition hover:bg-accent-soft ${
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
