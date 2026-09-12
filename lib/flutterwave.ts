// Server-only helpers around Flutterwave's v3 API. Never import this from
// a "use client" file — every call needs FLUTTERWAVE_SECRET_KEY, which must
// stay server-side.
//
// The marketplace uses Flutterwave subaccounts + split payments so a sale
// settles straight into the seller's own bank account (100% split — UNDR
// takes no cut) instead of pooling in one platform account. See
// marketplace_payout_accounts in the DB and savePayoutAccountAction in
// app/actions.ts for where a seller's subaccount gets created.

const FLW_BASE = "https://api.flutterwave.com/v3";

export type FlwResult<T> = { ok: true; data: T } | { ok: false; error: string };

function authHeaders(): Record<string, string> | null {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export function isFlutterwaveConfigured(): boolean {
  return !!process.env.FLUTTERWAVE_SECRET_KEY;
}

const NOT_CONFIGURED_ERROR = "Payouts aren't set up yet — ask an admin to add the Flutterwave keys.";

export async function fetchNigerianBanks(): Promise<FlwResult<{ code: string; name: string }[]>> {
  const headers = authHeaders();
  if (!headers) return { ok: false, error: NOT_CONFIGURED_ERROR };
  try {
    const res = await fetch(`${FLW_BASE}/banks/NG`, { headers, cache: "no-store" });
    const json = await res.json();
    if (json?.status !== "success" || !Array.isArray(json?.data)) {
      return { ok: false, error: "Couldn't load the bank list. Try again." };
    }
    const banks = (json.data as { code: string; name: string }[])
      .filter((b) => b.code && b.name)
      .map((b) => ({ code: String(b.code), name: String(b.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, data: banks };
  } catch {
    return { ok: false, error: "Couldn't reach Flutterwave. Try again." };
  }
}

export async function resolveAccountName(
  bankCode: string,
  accountNumber: string
): Promise<FlwResult<{ accountName: string }>> {
  const headers = authHeaders();
  if (!headers) return { ok: false, error: NOT_CONFIGURED_ERROR };
  try {
    const res = await fetch(`${FLW_BASE}/accounts/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
    });
    const json = await res.json();
    if (json?.status !== "success" || !json?.data?.account_name) {
      return { ok: false, error: "Couldn't verify that account — double-check the bank and account number." };
    }
    return { ok: true, data: { accountName: String(json.data.account_name) } };
  } catch {
    return { ok: false, error: "Couldn't reach Flutterwave. Try again." };
  }
}

export async function createOrUpdateSubaccount(opts: {
  existingSubaccountId: string | null;
  bankCode: string;
  accountNumber: string;
  businessName: string;
}): Promise<FlwResult<{ subaccountId: string }>> {
  const headers = authHeaders();
  if (!headers) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const body = JSON.stringify({
    account_bank: opts.bankCode,
    account_number: opts.accountNumber,
    business_name: opts.businessName,
    country: "NG",
    // Seller gets 100% of every sale — UNDR takes no platform cut.
    split_type: "percentage",
    split_value: 1,
  });
  try {
    const res = await fetch(
      opts.existingSubaccountId ? `${FLW_BASE}/subaccounts/${opts.existingSubaccountId}` : `${FLW_BASE}/subaccounts`,
      { method: opts.existingSubaccountId ? "PUT" : "POST", headers, body }
    );
    const json = await res.json();
    const subaccountId = json?.data?.subaccount_id ?? json?.data?.id ?? opts.existingSubaccountId;
    if (json?.status !== "success" || !subaccountId) {
      return { ok: false, error: "Couldn't set up the payout account with Flutterwave. Try again." };
    }
    return { ok: true, data: { subaccountId: String(subaccountId) } };
  } catch {
    return { ok: false, error: "Couldn't reach Flutterwave. Try again." };
  }
}

export async function verifyTransaction(
  transactionId: string
): Promise<FlwResult<{ status: string; amountNaira: number; txRef: string; currency: string }>> {
  const headers = authHeaders();
  if (!headers) return { ok: false, error: NOT_CONFIGURED_ERROR };
  try {
    const res = await fetch(`${FLW_BASE}/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers,
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.status !== "success" || !json?.data) {
      return { ok: false, error: "Couldn't verify the payment." };
    }
    return {
      ok: true,
      data: {
        status: String(json.data.status),
        amountNaira: Number(json.data.amount),
        txRef: String(json.data.tx_ref),
        currency: String(json.data.currency),
      },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Flutterwave to verify the payment. Try again." };
  }
}
