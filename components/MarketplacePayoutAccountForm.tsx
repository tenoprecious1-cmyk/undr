"use client";

import { useState, useTransition } from "react";
import { resolveBankAccountAction, savePayoutAccountAction } from "@/app/actions";
import type { NigerianBank } from "@/lib/types";

export default function MarketplacePayoutAccountForm({ banks }: { banks: NigerianBank[] }) {
  const [pending, startTransition] = useTransition();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const bankName = banks.find((b) => b.code === bankCode)?.name ?? "";
  const canVerify = bankCode && /^\d{10}$/.test(accountNumber);

  function onVerify() {
    setError(null);
    setResolvedName(null);
    startTransition(async () => {
      const result = await resolveBankAccountAction(bankCode, accountNumber);
      if ("error" in result) {
        setError(result.error);
      } else {
        setResolvedName(result.accountName);
      }
    });
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bank_code", bankCode);
      fd.set("bank_name", bankName);
      fd.set("account_number", accountNumber);
      const result = await savePayoutAccountAction(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  function onFieldChange() {
    setResolvedName(null);
    setSaved(false);
    setError(null);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Bank</label>
        <select
          value={bankCode}
          onChange={(e) => {
            setBankCode(e.target.value);
            onFieldChange();
          }}
          className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text focus:border-accent focus:outline-none"
        >
          <option value="">Select your bank</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-faint">Account number</label>
        <input
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
            onFieldChange();
          }}
          inputMode="numeric"
          placeholder="10-digit account number"
          className="mt-1.5 w-full rounded-xl border border-border-soft bg-surface/60 px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </div>

      {!resolvedName ? (
        <button
          type="button"
          onClick={onVerify}
          disabled={!canVerify || pending}
          className="rounded-full border border-border-soft bg-surface/60 px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify account"}
        </button>
      ) : (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/40 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Is this you?</p>
          <p className="mt-1 text-sm font-semibold text-text">{resolvedName}</p>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="mt-3 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Yes, save this account"}
          </button>
        </div>
      )}

      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      {saved && <p className="text-xs font-medium text-yes">Payout account saved — you&apos;re ready to sell.</p>}
    </div>
  );
}
