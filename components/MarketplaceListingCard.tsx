import Link from "next/link";
import type { MarketplaceListing } from "@/lib/types";
import { MARKETPLACE_CATEGORY_LABELS, nairaFormat } from "@/lib/types";

export default function MarketplaceListingCard({ listing }: { listing: MarketplaceListing }) {
  const cover = listing.media[0];

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-border-soft bg-surface/40 transition hover:border-border"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">🛍️</div>
        )}
        {listing.status === "sold" && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs text-text-faint">{MARKETPLACE_CATEGORY_LABELS[listing.category]}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-text">{listing.title}</p>
        <p className="mt-0.5 text-sm font-bold text-accent-2">{nairaFormat(listing.price_kobo)}</p>
      </div>
    </Link>
  );
}
