import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchMyPayoutAccount, isFeatureEnabled } from "@/lib/queries";
import { fetchNigerianBanks, isFlutterwaveConfigured } from "@/lib/flutterwave";
import { isAnyAdmin } from "@/lib/permissions";
import ComingSoon from "@/components/ComingSoon";
import MarketplacePayoutAccountForm from "@/components/MarketplacePayoutAccountForm";

export default async function PayoutAccountPage() {
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

  const existing = await fetchMyPayoutAccount(supabase, user!.id);
  const configured = isFlutterwaveConfigured();
  const banks = configured ? await fetchNigerianBanks() : ({ ok: false, error: "" } as const);

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/marketplace" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <h1 className="text-[15px] font-bold text-text">Payout account</h1>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <p className="text-sm text-text-dim">
          Add your bank account so payments for things you sell land straight in your bank — UNDR never holds or
          touches the money.
        </p>

        {existing && (
          <div className="mt-4 rounded-2xl border border-border-soft bg-surface/50 p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Currently set up</p>
            <p className="mt-1.5 text-sm text-text">{existing.account_name}</p>
            <p className="text-xs text-text-faint">
              {existing.bank_name} · {existing.account_number}
            </p>
          </div>
        )}

        {!configured ? (
          <p className="mt-6 rounded-2xl border border-border-soft bg-surface-2/40 px-4 py-3 text-sm text-text-faint">
            Payouts aren&apos;t set up yet — ask an admin to add the Flutterwave keys before sellers can connect a
            bank account.
          </p>
        ) : banks.ok ? (
          <MarketplacePayoutAccountForm banks={banks.data} />
        ) : (
          <p className="mt-6 text-sm font-medium text-danger">{banks.error}</p>
        )}
      </div>
    </div>
  );
}
