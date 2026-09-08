"use client";

import { useActionState } from "react";
import { signUpAction, type ActionState } from "@/app/actions";

const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate"];

export default function SignupForm({ preLaunch }: { preLaunch: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, null);

  return (
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
        minLength={6}
        placeholder="Password (6+ characters)"
        className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />
      <select
        name="level"
        required
        defaultValue=""
        className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="" disabled>
          Level / year
        </option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <input
        name="faculty"
        required
        placeholder="Faculty (e.g. COCCS)"
        className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />
      <input
        name="department"
        placeholder="Department (optional)"
        className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-accent px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Creating your identity…" : preLaunch ? "CREATE MY UNDR →" : "Enter UNDR →"}
      </button>
    </form>
  );
}
