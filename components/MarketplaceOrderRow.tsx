"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cancelMarketplaceOrderAction } from "@/app/actions";
import type { MarketplaceOrder } from "@/lib/types";
import { identityHandle, nairaFormat } from "@/lib/types";
import { timeAgo } from "@/lib/format";

const STATUS_LABEL: Record<MarketplaceOrder["status"], string> = {
  pending: "⏳ Awaiting payment",
  paid: "✅ Paid",
  cancelled: "✕ Cancelled",
  failed: "⚠️ Failed",
};

export default function MarketplaceOrderRow({
  order,
  viewerRole,
}: {
  order: MarketplaceOrder;
  viewerRole: "buyer" | "seller";
}) {
  const [, startTransition] = useTransition();
  const counterpart = viewerRole === "buyer" ? order.seller : order.buyer;
  const cover = order.listing.media[0];

  function onCancel() {
    startTransition(() => cancelMarketplaceOrderAction(order.id, "/marketplace/orders"));
  }

  return (
    <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3.5 sm:px-5">
      <Link href={`/marketplace/${order.listing_id}`} className="shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-surface-2 text-xl">🛍️</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/marketplace/${order.listing_id}`} className="truncate text-sm font-semibold text-text hover:underline">
          {order.listing.title}
        </Link>
        <p className="mt-0.5 text-sm font-bold text-accent-2">{nairaFormat(order.amount_kobo)}</p>
        <p className="mt-0.5 text-xs text-text-faint">
          {viewerRole === "buyer" ? "Seller" : "Buyer"}: {identityHandle(counterpart)} · {timeAgo(order.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs font-semibold text-text-dim">{STATUS_LABEL[order.status]}</span>
        {viewerRole === "buyer" && order.status === "pending" && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-text-faint transition hover:text-danger"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
