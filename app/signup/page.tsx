import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchPlatformSettings } from "@/lib/queries";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();
  const settings = await fetchPlatformSettings(supabase);
  const preLaunch = settings?.mode === "pre_launch";
  const showMessage = preLaunch && (settings?.prelaunch_message_enabled ?? true);
  const showCounter = preLaunch && (settings?.prelaunch_counter_enabled ?? true);
  const counter = settings?.launch_counter ?? 903;

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-text">
          <span>🕳️</span> UNDR
        </Link>

        {showMessage ? (
          <>
            <h1 className="text-2xl font-bold text-text">JOIN UNDR</h1>
            <p className="mt-1 text-sm text-text-dim">The other side of Bowen.</p>
            <p className="mt-4 text-sm text-text-faint">
              UNDR is opening for the upcoming Bowen session.
              <br />
              Register now and be ready when the doors open. 👀
            </p>
            {showCounter && (
              <p className="mt-3 text-sm font-semibold text-accent-2 tabular">
                {counter.toLocaleString()} people are getting ready for UNDR.
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text">You&apos;re not joining as yourself.</h1>
            <p className="mt-1 text-sm text-text-dim">You&apos;re joining as someone else. 🦊</p>
          </>
        )}

        <SignupForm preLaunch={preLaunch} />

        <p className="mt-4 text-center text-xs text-text-faint">
          No real name required. Your email stays private — you&apos;ll get a random anonymous identity the
          moment you join.
        </p>

        <p className="mt-6 text-center text-sm text-text-faint">
          Already {preLaunch ? "registered" : "undercover"}?{" "}
          <Link href="/login" className="font-semibold text-accent-2 hover:underline">
            {preLaunch ? "Sign in" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
