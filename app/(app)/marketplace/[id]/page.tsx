import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMarketplaceListing, isFeatureEnabled } from "@/lib/queries";
import { isAnyAdmin } from "@/lib/permissions";
import { identityHandle, MARKETPLACE_CATEGORY_LABELS, nairaFormat } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import MarketplaceCheckoutButton from "@/components/MarketplaceCheckoutButton";
import MarketplaceListingOwnerActions from "@/components/MarketplaceListingOwnerActions";

export default async function MarketplaceListingPage(props: PageProps<"/marketplace/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [enabled, isAdmin] = await Promise.all([
    isFeatureEnabled(supabase, "marketplace"),
    isAnyAdmin(supabase, user!.id),
  ]);
  if (!enabled && !isAdmin) notFound();

  const listing = await fetchMarketplaceListing(supabase, id);
  if (!listing) notFound();

  const isOwner = listing.seller_id === user!.id;
  const path = `/marketplace/${id}`;

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/marketplace" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <h1 className="text-[15px] font-bold text-text">Listing</h1>
      </div>

      {listing.media.length > 0 ? (
        <div
          className={`grid gap-1 overflow-hidden ${listing.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {listing.media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.id}
              src={m.url}
              alt=""
              className={`w-full object-cover ${listing.media.length === 1 ? "max-h-[28rem]" : "aspect-square"}`}
            />
          ))}
        </div>
      ) : (
        <div className="grid aspect-[2/1] w-full place-items-center bg-surface-2 text-5xl">🛍️</div>
      )}

      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            {MARKETPLACE_CATEGORY_LABELS[listing.category]}
            {listing.condition && ` · ${listing.condition}`}
          </p>
          {listing.status === "sold" && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-faint">
              Sold
            </span>
          )}
        </div>

        <h2 className="mt-1.5 text-xl font-bold text-text">{listing.title}</h2>
        <p className="mt-1 text-2xl font-bold text-accent-2">{nairaFormat(listing.price_kobo)}</p>

        <div className="mt-3 flex items-center gap-2 text-sm text-text-dim">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-sm">
            {listing.seller.emoji}
          </span>
          <span>{identityHandle(listing.seller)}</span>
          <span className="text-text-faint">· {timeAgo(listing.created_at)}</span>
        </div>

        {listing.description && (
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-text">{listing.description}</p>
        )}

        {(listing.contact_whatsapp || listing.contact_meetup) && (
          <div className="mt-4 rounded-2xl border border-border-soft bg-surface/50 p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Seller contact</p>
            {listing.contact_whatsapp && (
              <p className="mt-1.5 text-sm text-text">📱 WhatsApp: {listing.contact_whatsapp}</p>
            )}
            {listing.contact_meetup && <p className="mt-1 text-sm text-text">📍 Meetup: {listing.contact_meetup}</p>}
          </div>
        )}

        <div className="mt-6">
          {isOwner ? (
            <MarketplaceListingOwnerActions listingId={listing.id} status={listing.status} path={path} />
          ) : listing.status === "active" ? (
            <MarketplaceCheckoutButton listingId={listing.id} path={path} />
          ) : (
            <p className="rounded-full bg-surface-2/60 px-5 py-3 text-center text-sm font-semibold text-text-faint">
              This listing is no longer available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
