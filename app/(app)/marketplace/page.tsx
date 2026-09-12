import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchMarketplaceListings, isFeatureEnabled } from "@/lib/queries";
import { isAnyAdmin } from "@/lib/permissions";
import MarketplaceListingCard from "@/components/MarketplaceListingCard";
import ComingSoon from "@/components/ComingSoon";
import { MARKETPLACE_CATEGORY_LABELS } from "@/lib/types";

export default async function MarketplacePage(props: PageProps<"/marketplace">) {
  const { category } = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [enabled, isAdmin] = await Promise.all([
    isFeatureEnabled(supabase, "marketplace"),
    isAnyAdmin(supabase, user!.id),
  ]);

  if (!enabled && !isAdmin) {
    return (
      <ComingSoon
        emoji="🛍️"
        title="Marketplace"
        description="Buy and sell with other Bowen students — textbooks, gadgets, fashion, and more. Coming to UNDR."
      />
    );
  }

  const selectedCategory = typeof category === "string" ? category : "all";
  const listings = await fetchMarketplaceListings(supabase, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  return (
    <div>
      {!enabled && (
        <div className="border-b border-border-soft bg-accent-soft/40 px-4 py-2.5 text-center text-xs font-semibold text-accent-2 sm:px-5">
          👀 Admin preview — Marketplace is off for everyone else until you flip it on in Feature Control.
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border-soft px-4 py-4 sm:px-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">🛍️ Marketplace</h1>
          <p className="mt-0.5 text-sm text-text-dim">Buy and sell with other students.</p>
        </div>
        <Link
          href="/marketplace/new"
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-95"
        >
          + Sell
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border-soft px-4 py-3 sm:px-5">
        <Link
          href="/marketplace"
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            selectedCategory === "all" ? "bg-accent text-white" : "bg-surface-2/60 text-text-dim hover:text-text"
          }`}
        >
          All
        </Link>
        {Object.entries(MARKETPLACE_CATEGORY_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/marketplace?category=${key}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedCategory === key ? "bg-accent text-white" : "bg-surface-2/60 text-text-dim hover:text-text"
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/marketplace/payout-account"
          className="ml-auto shrink-0 rounded-full bg-surface-2/60 px-3.5 py-1.5 text-xs font-semibold text-text-dim transition hover:text-text"
        >
          🏦 Payouts
        </Link>
        <Link
          href="/marketplace/orders"
          className="shrink-0 rounded-full bg-surface-2/60 px-3.5 py-1.5 text-xs font-semibold text-text-dim transition hover:text-text"
        >
          My orders
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">📦</p>
          <p className="mt-3 font-semibold text-text">Nothing here yet.</p>
          <p className="mt-1 text-sm">Be the first to list something.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {listings.map((listing) => (
            <MarketplaceListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
