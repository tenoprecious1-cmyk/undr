import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/queries";
import { isAnyAdmin } from "@/lib/permissions";
import ComingSoon from "@/components/ComingSoon";
import MarketplaceListingForm from "@/components/MarketplaceListingForm";

export default async function NewMarketplaceListingPage() {
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

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/marketplace" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <h1 className="text-[15px] font-bold text-text">Sell something</h1>
      </div>
      <MarketplaceListingForm />
    </div>
  );
}
