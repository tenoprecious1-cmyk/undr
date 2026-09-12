"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketplaceOrderAction, verifyMarketplacePaymentAction } from "@/app/actions";

declare global {
  interface Window {
    FlutterwaveCheckout?: (opts: Record<string, unknown>) => void;
  }
}

const FLW_SCRIPT_SRC = "https://checkout.flutterwave.com/v3.js";

function loadFlutterwaveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FLW_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Flutterwave script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = FLW_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Flutterwave script failed to load"));
    document.body.appendChild(script);
  });
}

export default function MarketplaceCheckoutButton({ listingId, path }: { listingId: string; path: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "starting" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

  async function onBuy() {
    setError(null);

    if (!publicKey) {
      setError("Checkout isn't set up yet — ask an admin to add the Flutterwave keys.");
      return;
    }

    setStatus("starting");
    const init = await createMarketplaceOrderAction(listingId);
    if ("error" in init) {
      setError(init.error);
      setStatus("idle");
      return;
    }

    try {
      await loadFlutterwaveScript();
    } catch {
      setError("Couldn't load the checkout popup. Check your connection and try again.");
      setStatus("idle");
      return;
    }

    if (!window.FlutterwaveCheckout) {
      setError("Couldn't load the checkout popup. Try again.");
      setStatus("idle");
      return;
    }

    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: init.txRef,
      amount: init.amountNaira,
      currency: "NGN",
      payment_options: "card,ussd,banktransfer",
      // Splits 100% of this charge straight to the seller's own bank
      // account via their Flutterwave subaccount — UNDR never holds it.
      subaccounts: [{ id: init.sellerSubaccountId, transaction_split_ratio: 100 }],
      customer: { email: init.buyerEmail },
      customizations: { title: "UNDR Marketplace", description: "Marketplace purchase" },
      callback: (response: { transaction_id?: string | number; status?: string }) => {
        if (!response?.transaction_id) {
          setError("Payment didn't go through.");
          setStatus("idle");
          return;
        }
        setStatus("verifying");
        verifyMarketplacePaymentAction(init.orderId, String(response.transaction_id), path).then((result) => {
          if ("error" in result) {
            setError(result.error);
            setStatus("idle");
          } else {
            setStatus("idle");
            router.refresh();
          }
        });
      },
      onclose: () => setStatus((s) => (s === "verifying" ? s : "idle")),
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBuy}
        disabled={status !== "idle"}
        className="w-full rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {status === "starting" ? "Starting checkout…" : status === "verifying" ? "Confirming payment…" : "Buy now"}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      {!publicKey && (
        <p className="mt-2 text-xs text-text-faint">Checkout preview — payments go live once Flutterwave keys are added.</p>
      )}
    </div>
  );
}
