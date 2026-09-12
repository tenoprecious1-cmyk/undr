"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { identityHandle } from "@/lib/types";
import { fetchRepliesForCleanShotAction, type CleanShotReplyOption } from "@/app/actions";
import CleanShotCard from "./CleanShotCard";

const MAX_REPLIES = 5;

type Phase = "edit" | "select-replies" | "ready";

export default function CleanShotModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("edit");
  const [cardStyle, setCardStyle] = useState<"dark" | "light">("dark");
  const [includeEngagement, setIncludeEngagement] = useState(true);
  const [includeReplies, setIncludeReplies] = useState(false);
  const [allReplies, setAllReplies] = useState<CleanShotReplyOption[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (post.reply_count > 0 && allReplies === null && !loadingReplies) {
      setLoadingReplies(true);
      fetchRepliesForCleanShotAction(post.id)
        .then((replies) => setAllReplies(replies))
        .catch(() => setAllReplies([]))
        .finally(() => setLoadingReplies(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const selectedReplies = useMemo(() => {
    if (!includeReplies || !allReplies) return [];
    const byId = new Map(allReplies.map((r) => [r.id, r]));
    return selectedIds.map((id) => byId.get(id)).filter((r): r is CleanShotReplyOption => !!r);
  }, [includeReplies, allReplies, selectedIds]);

  function toggleReply(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_REPLIES) return prev;
      return [...prev, id];
    });
  }

  function moveSelected(id: string, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleCreateShot() {
    if (!cardRef.current) return;
    setError(null);
    setGenerating(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: cardStyle === "dark" ? "#0a0a0c" : "#ffffff",
      });
      if (!blob) throw new Error("empty");
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setResultBlob(blob);
      setResultUrl(url);
      setPhase("ready");
    } catch {
      setError("Couldn't generate the image. Try again, or remove attached media and retry.");
    } finally {
      setGenerating(false);
    }
  }

  function handleBackToEdit() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setResultUrl(null);
    setResultBlob(null);
    setPhase("edit");
  }

  function handleSave() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `undr-cleanshot-${post.id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleShare() {
    if (!resultBlob) return;
    try {
      const file = new File([resultBlob], `undr-cleanshot-${post.id.slice(0, 8)}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "UNDR",
          text: "The other side of Bowen.",
        });
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to save */
    }
    handleSave();
  }

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="badge-sheet flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-border-soft bg-bg-elevated sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text">
            {phase === "select-replies" ? "Select Replies" : phase === "ready" ? "Clean Shot Ready" : "Clean Shot"}
          </h2>
          <button
            type="button"
            onClick={phase === "select-replies" ? () => setPhase("edit") : onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-text-faint transition hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            {phase === "select-replies" ? "‹" : "✕"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {phase === "select-replies" ? (
            <ReplyPicker
              replies={allReplies ?? []}
              loading={loadingReplies}
              selectedIds={selectedIds}
              onToggle={toggleReply}
            />
          ) : phase === "ready" && resultUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrl}
                alt="Clean Shot preview"
                className="max-h-[50dvh] w-full rounded-2xl border border-border-soft object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <div className="w-full overflow-x-auto">
                <div className="mx-auto w-fit">
                  <CleanShotCard
                    ref={cardRef}
                    post={post}
                    style={cardStyle}
                    includeEngagement={includeEngagement}
                    replies={selectedReplies}
                    width={320}
                  />
                </div>
              </div>

              <div className="w-full">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-faint">Style</p>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCardStyle(s)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                        cardStyle === s
                          ? "border-accent bg-accent-soft text-accent-2"
                          : "border-border-soft text-text-dim hover:text-text"
                      }`}
                    >
                      {s === "dark" ? "● Dark" : "○ Light"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-faint">Include</p>
                <label className="flex items-center justify-between border-b border-border-soft py-2.5 text-sm text-text-faint">
                  Original Post
                  <input type="checkbox" checked disabled className="h-4 w-4 accent-[var(--accent)]" />
                </label>
                <label className="flex items-center justify-between border-b border-border-soft py-2.5 text-sm text-text">
                  Engagement
                  <input
                    type="checkbox"
                    checked={includeEngagement}
                    onChange={(e) => setIncludeEngagement(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
                <label
                  className={`flex items-center justify-between py-2.5 text-sm ${
                    post.reply_count === 0 ? "text-text-faint" : "text-text"
                  }`}
                >
                  Replies
                  <input
                    type="checkbox"
                    checked={includeReplies}
                    disabled={post.reply_count === 0}
                    onChange={(e) => {
                      setIncludeReplies(e.target.checked);
                      if (!e.target.checked) setSelectedIds([]);
                    }}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>

                {includeReplies && (
                  <button
                    type="button"
                    onClick={() => setPhase("select-replies")}
                    className="mt-3 flex w-full items-center justify-between rounded-xl border border-border-soft px-3.5 py-2.5 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                  >
                    <span>+ Select Replies</span>
                    <span className="tabular text-text-faint">
                      {selectedIds.length} / {MAX_REPLIES}
                    </span>
                  </button>
                )}

                {includeReplies && selectedReplies.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {selectedReplies.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-lg bg-surface/50 px-2.5 py-1.5 text-xs text-text-dim"
                      >
                        <span className="truncate">
                          {r.author.emoji} {identityHandle(r.author)}
                        </span>
                        <span className="ml-auto flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => moveSelected(r.id, -1)}
                            className="grid h-5 w-5 place-items-center rounded hover:bg-surface-2"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelected(r.id, 1)}
                            className="grid h-5 w-5 place-items-center rounded hover:bg-surface-2"
                          >
                            ▼
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="w-full text-xs font-medium text-red-400">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft px-5 py-4">
          {phase === "select-replies" ? (
            <button
              type="button"
              onClick={() => setPhase("edit")}
              className="w-full rounded-full bg-accent py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Done
            </button>
          ) : phase === "ready" ? (
            <>
              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full rounded-full bg-accent py-3 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Share
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBackToEdit}
                  className="flex-1 rounded-full border border-border-soft py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 rounded-full border border-border-soft py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                >
                  Save Image
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-border-soft py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateShot}
                disabled={generating}
                className="flex-1 rounded-full bg-accent py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {generating ? "Creating…" : "Create Shot"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyPicker({
  replies,
  loading,
  selectedIds,
  onToggle,
}: {
  replies: CleanShotReplyOption[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-text-faint">Loading replies…</p>;
  }
  if (replies.length === 0) {
    return <p className="py-10 text-center text-sm text-text-faint">No replies to select yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {replies.map((r) => {
        const checked = selectedIds.includes(r.id);
        const disabled = !checked && selectedIds.length >= MAX_REPLIES;
        return (
          <label
            key={r.id}
            className={`flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition ${
              disabled ? "opacity-40" : "hover:bg-surface/50"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(r.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">
                {r.author.emoji} {identityHandle(r.author)}
              </p>
              <p className="mt-0.5 truncate text-sm text-text-dim">&ldquo;{r.content}&rdquo;</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
