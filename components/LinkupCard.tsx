"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLinkupDownAction } from "@/app/actions";
import { identityHandle } from "@/lib/types";
import { timeAgo, timeLeft, compactNumber } from "@/lib/format";
import type { Linkup } from "@/lib/types";
import UserBadges from "./UserBadges";

export default function LinkupCard({ linkup }: { linkup: Linkup }) {
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic(
    { down: linkup.viewer_down, count: linkup.im_down_count },
    (_state, down: boolean) => ({ down, count: linkup.im_down_count + (down ? 1 : -1) })
  );

  function onToggle() {
    const next = !state.down;
    startTransition(async () => {
      setState(next);
      await toggleLinkupDownAction(linkup.id, state.down);
    });
  }

  return (
    <div className="border-b border-border-soft px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
          {linkup.vibe_emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-text">{identityHandle(linkup.author)}</span>
            <UserBadges profile={linkup.author} />
            <span className="text-text-faint">· {timeAgo(linkup.created_at)}</span>
          </div>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-text">{linkup.activity}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
            {linkup.location && <span>📍 {linkup.location}</span>}
            <span>⏳ {timeLeft(linkup.expires_at)}</span>
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onToggle}
              className={`rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${
                state.down
                  ? "bg-accent text-white"
                  : "border border-border text-text hover:border-accent"
              }`}
            >
              {state.down ? "You're down ✓" : "I'm down"}
            </button>
            <span className="text-xs text-text-faint tabular">
              {compactNumber(state.count)} {state.count === 1 ? "person" : "people"} down
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
