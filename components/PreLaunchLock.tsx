"use client";

import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";

const SEEN_KEY = "undr_prelaunch_intro_seen";

type Phase = "intro" | "welcome";

export default function PreLaunchLock({
  counter,
  showCounter,
}: {
  counter: number;
  showCounter: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("intro");

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    setPhase(seen ? "welcome" : "intro");
  }, []);

  function continueToWelcome() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("welcome");
  }

  if (phase === "intro") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <span className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-text">
            <span>🕳️</span> UNDR
          </span>
          <p className="text-2xl font-bold text-text">WELCOME TO UNDR.</p>
          <p className="mt-1 text-sm text-text-dim">The other side of Bowen.</p>
          <p className="mt-4 text-sm text-text-faint">You&apos;re registered. Here&apos;s what happens next. 👀</p>
          <button
            onClick={continueToWelcome}
            className="mt-8 w-full rounded-full bg-accent px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110"
          >
            CONTINUE →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <span className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-text">
          <span>🕳️</span> UNDR
        </span>

        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl">
          🔒
        </span>

        <h1 className="text-2xl font-bold text-text">Welcome to UNDR.</h1>
        <p className="mt-2 text-sm text-text-dim">You&apos;re in — but the doors aren&apos;t open yet.</p>

        {showCounter && (
          <p className="mt-4 text-sm font-semibold text-accent-2 tabular">
            {counter.toLocaleString()} people are getting ready for UNDR.
          </p>
        )}

        <p className="mt-4 text-sm text-text-faint">
          UNDR opens at the commencement of the new session. Nobody gets in until then — sit tight. 👀
        </p>

        <p className="mt-6 text-xs text-text-faint">We&apos;ll let you know the moment it&apos;s time.</p>

        <form action={logoutAction} className="mt-8">
          <button
            type="submit"
            className="text-sm font-semibold text-text-faint underline-offset-2 hover:text-text hover:underline"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
