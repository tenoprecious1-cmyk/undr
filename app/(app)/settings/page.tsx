import { createClient } from "@/lib/supabase/server";
import { identityHandle } from "@/lib/types";
import { logoutAction, replayOnboardingTourAction } from "@/app/actions";
import type { Profile } from "@/lib/types";
import UserBadges from "@/components/UserBadges";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="text-xl font-bold text-text">Settings</h1>
      </div>

      <div className="px-5 py-6">
        <div className="rounded-2xl border border-border-soft bg-surface/50 p-4">
          <p className="text-sm text-text-faint">Your identity</p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-text">
            {profile!.emoji} {identityHandle(profile as Profile)}
            <UserBadges profile={profile as Profile} size="md" />
          </p>
          <p className="mt-1 text-xs text-text-faint">
            This is how you appear to everyone on UNDR. It never changes.
          </p>
        </div>

        <form action={replayOnboardingTourAction} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-full border border-border-soft px-4 py-3 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
          >
            🧭 Replay Tour
          </button>
        </form>

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-full border border-danger/40 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
