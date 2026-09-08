"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionState } from "@/app/actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, null);
  const params = useSearchParams();
  const justSignedUp = params.get("confirm") === "1";
  const wasBanned = params.get("banned") === "1";

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-text">
          <span>🕳️</span> UNDR
        </Link>

        {justSignedUp && (
          <p className="mb-4 rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-sm text-text">
            Check your email to confirm your account, then log in below.
          </p>
        )}

        {wasBanned && (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-text">
            This account has been suspended. Contact an admin if you think that&apos;s a mistake.
          </p>
        )}

        <h1 className="text-2xl font-bold text-text">Welcome back.</h1>
        <p className="mt-1 text-sm text-text-dim">Log back in as whoever you are.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-full bg-accent px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Entering…" : "Enter UNDR →"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-faint">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent-2 hover:underline">
            Create an identity
          </Link>
        </p>
      </div>
    </div>
  );
}
