"use client";

import { useState } from "react";
import VerifiedBadgeIcon from "./badges/VerifiedBadge";
import GoldBadgeIcon from "./badges/GoldBadge";
import type { Profile } from "@/lib/types";

type BadgeKind = "verified" | "gold";

const SIZE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-[14px] w-[14px]",
  md: "h-[17px] w-[17px]",
  lg: "h-6 w-6",
};

export default function UserBadges({
  profile,
  size = "sm",
}: {
  profile: Pick<Profile, "verification_status" | "gold_status">;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState<BadgeKind | null>(null);
  const isVerified = profile.verification_status === "verified";
  const isGold = profile.gold_status;

  if (!isVerified && !isGold) return null;

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {isVerified && (
        <span className="group/tip relative inline-flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen("verified");
            }}
            className="inline-flex cursor-pointer items-center rounded"
            aria-label="Verified by UNDR"
          >
            <VerifiedBadgeIcon className={SIZE_CLASS[size]} />
          </button>
          <span className="badge-tooltip pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-soft bg-bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text shadow-lg group-hover/tip:block">
            Verified by UNDR
          </span>
        </span>
      )}
      {isGold && (
        <span className="group/tip relative inline-flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen("gold");
            }}
            className="inline-flex cursor-pointer items-center rounded"
            aria-label="UNDR Gold"
          >
            <GoldBadgeIcon className={SIZE_CLASS[size]} />
          </button>
          <span className="badge-tooltip pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-soft bg-bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text shadow-lg group-hover/tip:block">
            UNDR Gold
          </span>
        </span>
      )}

      {open && <BadgeInfoSheet kind={open} onClose={() => setOpen(null)} />}
    </span>
  );
}

function BadgeInfoSheet({ kind, onClose }: { kind: BadgeKind; onClose: () => void }) {
  const isVerified = kind === "verified";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="badge-sheet w-full max-w-sm rounded-t-3xl border border-border-soft bg-bg-elevated p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {isVerified ? <VerifiedBadgeIcon className="h-8 w-8" /> : <GoldBadgeIcon className="h-8 w-8" />}
          <h2 className="text-lg font-bold text-text">{isVerified ? "UNDR Verified" : "UNDR Gold"}</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-dim">
          {isVerified
            ? "This account has been verified by UNDR. Verification confirms account authenticity without ever exposing a user's real identity."
            : "Rare recognition personally awarded by UNDR administration. Gold cannot be bought, unlocked automatically, or earned through popularity alone."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-border-soft py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
        >
          Close
        </button>
      </div>
    </div>
  );
}
