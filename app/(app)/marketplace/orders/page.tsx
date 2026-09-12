import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  fetchMarketplaceOrdersAsBuyer,
  fetchMarketplaceOrdersAsSeller,
  isFeatureEnabled,
} from "@/lib/queries";
import { isAnyAdmin } from "@/lib/permissions";
import ComingSoon from "@/components/ComingSoon";
import MarketplaceOrderRow from "@/components/MarketplaceOrderRow";

export default async function MarketplaceOrdersPage(props: PageProps<"/marketplace/orders">) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "selling" ? "selling" : "buying";

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
        description="Buy and sell with other Bowen students. Coming to UNDR."
      />
    );
  }

  const orders =
    tab === "selling"
      ? await fetchMarketplaceOrdersAsSeller(supabase, user!.id)
      : await fetchMarketplaceOrdersAsBuyer(supabase, user!.id);

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/marketplace" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <h1 className="text-[15px] font-bold text-text">My orders</h1>
      </div>

      <div className="flex gap-2 border-b border-border-soft px-4 py-3 sm:px-5">
        <Link
          href="/marketplace/orders?tab=buying"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "buying" ? "bg-accent text-white" : "bg-surface-2/60 text-text-dim hover:text-text"
          }`}
        >
          Buying
        </Link>
        <Link
          href="/marketplace/orders?tab=selling"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "selling" ? "bg-accent text-white" : "bg-surface-2/60 text-text-dim hover:text-text"
          }`}
        >
          Selling
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">📦</p>
          <p className="mt-3 font-semibold text-text">
            {tab === "buying" ? "No purchases yet." : "No sales yet."}
          </p>
        </div>
      ) : (
        orders.map((order) => (
          <MarketplaceOrderRow key={order.id} order={order} viewerRole={tab === "buying" ? "buyer" : "seller"} />
        ))
      )}
    </div>
  );
}
