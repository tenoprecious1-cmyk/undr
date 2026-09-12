import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client authenticated with the Supabase service role key —
 * it bypasses RLS entirely. NEVER import this from a "use client" file or
 * send its key to the browser.
 *
 * There is exactly one legitimate reason to use this in the app: after the
 * marketplace checkout server action has independently verified a payment
 * with Paystack's API (reference + amount + status all checked), it needs
 * to flip an order to "paid". RLS deliberately has no policy that lets a
 * buyer do that themselves (see the marketplace_feature migration) — a
 * buyer able to set their own order to "paid" directly would be able to
 * fake having paid. The service-role client is what performs that one
 * write, after — and only after — Paystack has confirmed the charge.
 *
 * Returns null if SUPABASE_SERVICE_ROLE_KEY isn't configured yet, so the
 * app degrades to a clear "not set up yet" message instead of crashing.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
