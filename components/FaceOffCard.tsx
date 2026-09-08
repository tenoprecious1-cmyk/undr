"use client";

import { useOptimistic, useTransition } from "react";
import { voteFaceOffAction } from "@/app/actions";
import { compactNumber } from "@/lib/format";
import type { FaceOff } from "@/lib/types";

export default function FaceOffCard({ faceoff }: { faceoff: FaceOff }) {
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic(
    { side: faceoff.viewer_side ?? null, yes: faceoff.yes_count, no: faceoff.no_count },
    (_state, side: "yes" | "no") => ({
      side,
      yes: faceoff.yes_count + (side === "yes" ? 1 : 0),
      no: faceoff.no_count + (side === "no" ? 1 : 0),
    })
  );

  const total = state.yes + state.no || 1;
  const yesPct = Math.round((state.yes / total) * 100);
  const noPct = 100 - yesPct;
  const hasVoted = !!state.side;

  function onVote(side: "yes" | "no") {
    if (hasVoted) return;
    startTransition(async () => {
      setState(side);
      await voteFaceOffAction(faceoff.id, side);
    });
  }

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-b from-accent-soft/60 to-transparent">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          🔴 Live Face-Off
        </span>
        <span className="text-xs font-semibold text-text-faint tabular">
          {compactNumber(state.yes + state.no)} votes
        </span>
      </div>

      <h1 className="px-5 pb-1 pt-3 text-xl font-bold leading-snug text-text">{faceoff.question}</h1>
      <p className="px-5 pb-5 text-sm text-text-dim">Pick a side. You can&apos;t change your vote once it&apos;s in.</p>

      <div className="flex flex-col gap-3 px-5 pb-6">
        <button
          type="button"
          disabled={hasVoted}
          onClick={() => onVote("yes")}
          className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
            hasVoted ? "border-border-soft" : "border-border hover:border-yes cursor-pointer"
          } ${state.side === "yes" ? "border-yes" : ""}`}
        >
          {hasVoted && (
            <span
              className="absolute inset-y-0 left-0 bg-yes/15 transition-all duration-700 ease-out"
              style={{ width: `${yesPct}%` }}
            />
          )}
          <span className="relative flex items-center justify-between">
            <span className="text-base font-bold text-text">{faceoff.yes_label}</span>
            {hasVoted && <span className="tabular text-lg font-bold text-yes">{yesPct}%</span>}
          </span>
        </button>

        <button
          type="button"
          disabled={hasVoted}
          onClick={() => onVote("no")}
          className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
            hasVoted ? "border-border-soft" : "border-border hover:border-no cursor-pointer"
          } ${state.side === "no" ? "border-no" : ""}`}
        >
          {hasVoted && (
            <span
              className="absolute inset-y-0 left-0 bg-no/15 transition-all duration-700 ease-out"
              style={{ width: `${noPct}%` }}
            />
          )}
          <span className="relative flex items-center justify-between">
            <span className="text-base font-bold text-text">{faceoff.no_label}</span>
            {hasVoted && <span className="tabular text-lg font-bold text-no">{noPct}%</span>}
          </span>
        </button>
      </div>
    </div>
  );
}
