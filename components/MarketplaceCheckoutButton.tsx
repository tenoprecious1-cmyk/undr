"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketplaceOrderAction, verifyMarketplacePaymentAction } from "@/app/actions";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PAYSTACK_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Paystack script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paystack script failed to load"));
    document.body.appendChild(script);
  });
}

export default function MarketplaceCheckoutButton({ listingId, path }: { listingId: string; path: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "starting" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  async function onBuy() {
    setError(null);

    if (!publicKey) {
      setError("Checkout isn't set up yet — ask an admin to add the Paystack keys.");
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
      await loadPaystackScript();
    } catch {
      setError("Couldn't load the checkout popup. Check your connection and try again.");
      setStatus("idle");
      return;
    }

    if (!window.PaystackPop) {
      setError("Couldn't load the checkout popup. Try again.");
      setStatus("idle");
      return;
    }

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: init.buyerEmail,
      amount: init.amountKobo,
      ref: init.reference,
      currency: "NGN",
      onClose: () => setStatus("idle"),
      callback: () => {
        setStatus("verifying");
        verifyMarketplacePaymentAction(init.orderId, path).then((result) => {
          if ("error" in result) {
            setError(result.error);
            setStatus("idle");
          } else {
            setStatus("idle");
            router.refresh();
          }
        });
      },
    });
    handler.openIframe();
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
        <p className="mt-2 text-xs text-text-faint">Checkout preview — payments go live once Paystack keys are added.</p>
      )}
    </div>
  );
}
