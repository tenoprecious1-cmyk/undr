"use client";

import { useState, useTransition } from "react";
import {
  deleteMarketplaceListingAction,
  setMarketplaceListingStatusAction,
} from "@/app/actions";
import type { MarketplaceListingStatus } from "@/lib/types";

export default function MarketplaceListingOwnerActions({
  listingId,
  status,
  path,
}: {
  listingId: string;
  status: MarketplaceListingStatus;
  path: string;
}) {
  const [, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function toggleSold() {
    const next: MarketplaceListingStatus = status === "sold" ? "active" : "sold";
    startTransition(() => setMarketplaceListingStatusAction(listingId, next, path));
  }

  function onDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
      return;
    }
    startTransition(() => deleteMarketplaceListingAction(listingId));
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={toggleSold}
        className="flex-1 rounded-full border border-border-soft bg-surface/60 px-4 py-3 text-sm font-semibold text-text transition hover:bg-surface-2"
      >
        {status === "sold" ? "Mark as available" : "Mark as sold"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
          confirmingDelete
            ? "bg-danger text-white"
            : "border border-border-soft bg-surface/60 text-danger hover:bg-surface-2"
        }`}
      >
        {confirmingDelete ? "Tap again to delete" : "Delete listing"}
      </button>
    </div>
  );
}
