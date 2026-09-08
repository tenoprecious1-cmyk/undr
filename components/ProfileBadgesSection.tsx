"use client";

import { useState } from "react";
import type { Profile, UserBadge } from "@/lib/types";
import GoldBadgeIcon from "./badges/GoldBadge";

function formatAwardedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfileBadgesSection({
  profile,
  badges,
}: {
  profile: Pick<Profile, "gold_status" | "gold_awarded_at" | "gold_reason" | "gold_reason_public">;
  badges: UserBadge[];
}) {
  const [active, setActive] = useState<UserBadge | null>(null);

  return (
    <div className="mt-5">
      {profile.gold_status && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-[color:var(--gold-3)]/50 bg-gradient-to-b from-[color:var(--gold-glow)]/25 to-transparent p-4">
          <div className="flex items-center gap-2.5">
            <GoldBadgeIcon className="h-7 w-7" />
            <span className="text-sm font-bold uppercase tracking-wide text-[color:var(--gold-2)]">
              UNDR Gold
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-text-dim">
            Rare recognition personally awarded by UNDR administration.
          </p>
          {profile.gold_reason_public && profile.gold_reason && (
            <p className="mt-1.5 text-sm italic text-text-dim">&ldquo;{profile.gold_reason}&rdquo;</p>
          )}
          {profile.gold_awarded_at && (
            <p className="mt-2 text-xs font-semibold text-text-faint">
              Awarded {formatAwardedDate(profile.gold_awarded_at)}
            </p>
          )}
        </div>
      )}

      {badges.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-text-faint">Badges</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {badges.map((ub) => (
              <button
                key={ub.id}
                type="button"
                onClick={() => setActive(ub)}
                className="flex items-start gap-3 rounded-2xl border border-border-soft bg-surface/50 p-3 text-left transition hover:border-accent/40 hover:bg-surface/80"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
                  {ub.badge.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-text">{ub.badge.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-text-faint">
                    {ub.badge.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setActive(null)}
        >
          <div
            className="badge-sheet w-full max-w-sm rounded-t-3xl border border-border-soft bg-bg-elevated p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-2xl">
                {active.badge.icon}
              </span>
              <h2 className="text-lg font-bold text-text">{active.badge.name}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-dim">{active.badge.description}</p>
            <p className="mt-2 text-xs font-semibold text-text-faint">
              Awarded {formatAwardedDate(active.awarded_at)}
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-6 w-full rounded-full border border-border-soft py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
