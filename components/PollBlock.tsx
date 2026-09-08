"use client";

import { useOptimistic, useTransition } from "react";
import { compactNumber } from "@/lib/format";
import { votePollAction } from "@/app/actions";
import type { PollOption } from "@/lib/types";

export default function PollBlock({
  postId,
  path,
  options,
  votedOptionId,
}: {
  postId: string;
  path: string;
  options: PollOption[];
  votedOptionId: string | null;
}) {
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic(
    { votedOptionId, options },
    (_state, optionId: string) => ({
      votedOptionId: optionId,
      options: options.map((o) => (o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o)),
    })
  );

  const total = state.options.reduce((s, o) => s + o.vote_count, 0) || 1;
  const hasVoted = !!state.votedOptionId;

  function onVote(optionId: string) {
    if (hasVoted) return;
    startTransition(async () => {
      setState(optionId);
      await votePollAction(postId, optionId, path);
    });
  }

  return (
    <div className="mt-3 flex max-w-md flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {state.options.map((o) => {
        const pct = Math.round((o.vote_count / total) * 100);
        const isVoted = state.votedOptionId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={hasVoted}
            onClick={() => onVote(o.id)}
            className={`relative overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
              hasVoted
                ? "border-border-soft"
                : "border-border hover:border-accent cursor-pointer"
            } ${isVoted ? "border-accent" : ""}`}
          >
            {hasVoted && (
              <span
                className="absolute inset-y-0 left-0 bg-accent-soft transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative flex items-center justify-between font-medium text-text">
              <span>{o.label}</span>
              {hasVoted && <span className="tabular text-text-dim">{pct}%</span>}
            </span>
          </button>
        );
      })}
      <p className="text-xs text-text-faint tabular">{compactNumber(total)} votes</p>
    </div>
  );
}
