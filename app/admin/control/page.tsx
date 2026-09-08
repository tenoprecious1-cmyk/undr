import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchPlatformSettings } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { adminSaveControlSettingsAction, adminOpenUndrAction } from "@/app/actions";

const PHASES: { key: string; label: string; blurb: string }[] = [
  { key: "underground", label: "Underground", blurb: "Anonymous identity only. No followers, no following, no profile pictures." },
  { key: "social", label: "Social", blurb: "Username/alias, followers, following, profile pictures — all on." },
  { key: "open", label: "Open", blurb: "Real identity becomes configurable. Followers, following, profile pictures on." },
];

const IDENTITY_MODES: { key: string; label: string }[] = [
  { key: "anonymous", label: "Anonymous" },
  { key: "alias", label: "Username / Alias" },
  { key: "real", label: "Real Identity" },
];

export default async function AdminControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await can(supabase, user.id, "manage_platform_settings");
  if (!allowed) redirect("/admin");

  const settings = await fetchPlatformSettings(supabase);
  if (!settings) return <p className="text-sm text-text-faint">Platform settings unavailable.</p>;

  const isOpen = settings.mode === "open";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text">UNDR CONTROL</h1>
      <p className="mt-1 text-sm text-text-faint">
        Manual control over launch, platform phase, and identity. UNDR never opens on its own.
      </p>

      <Link
        href="/admin/control/features"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-soft px-3.5 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
      >
        🎛️ Feature Control →
      </Link>

      {/* Status */}
      <div className="mt-6 rounded-2xl border border-border-soft bg-surface/50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Current mode</p>
        <p className="mt-1.5 flex items-center gap-2 text-xl font-bold text-text">
          {isOpen ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> OPEN
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffd76a]" /> PRE-LAUNCH
            </>
          )}
        </p>
        {!isOpen && (
          <form action={adminOpenUndrAction} className="mt-4">
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110"
            >
              🚀 OPEN UNDR
            </button>
            <p className="mt-2 text-xs text-text-faint">
              This is permanent and manual. Pre-launch messaging and the counter disappear immediately.
            </p>
          </form>
        )}
      </div>

      <form action={adminSaveControlSettingsAction} className="mt-6 flex flex-col gap-6">
        {/* Pre-launch */}
        <section className="rounded-2xl border border-border-soft bg-surface/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Pre-launch</p>

          <label className="mt-3 block text-sm text-text-dim">
            Launch counter
            <input
              type="number"
              name="launch_counter"
              defaultValue={settings.launch_counter}
              min={0}
              className="mt-1 w-full rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
            />
          </label>

          <label className="mt-4 flex items-center justify-between text-sm text-text">
            Pre-launch message
            <input
              type="checkbox"
              name="prelaunch_message_enabled"
              defaultChecked={settings.prelaunch_message_enabled}
              className="h-5 w-9 shrink-0 accent-accent"
            />
          </label>
          <label className="mt-3 flex items-center justify-between text-sm text-text">
            Pre-launch counter
            <input
              type="checkbox"
              name="prelaunch_counter_enabled"
              defaultChecked={settings.prelaunch_counter_enabled}
              className="h-5 w-9 shrink-0 accent-accent"
            />
          </label>
        </section>

        {/* Platform phase */}
        <section className="rounded-2xl border border-border-soft bg-surface/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Platform phase</p>
          <div className="mt-3 flex flex-col gap-2">
            {PHASES.map((p) => (
              <label
                key={p.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-soft px-3.5 py-3 has-[:checked]:border-accent/60 has-[:checked]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="platform_phase"
                  value={p.key}
                  defaultChecked={settings.platform_phase === p.key}
                  className="mt-1 accent-accent"
                />
                <span>
                  <span className="block text-sm font-semibold text-text">{p.label}</span>
                  <span className="block text-xs text-text-faint">{p.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Identity controls */}
        <section className="rounded-2xl border border-border-soft bg-surface/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Public identity</p>
          <div className="mt-3 flex flex-col gap-2">
            {IDENTITY_MODES.map((m) => (
              <label
                key={m.key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-soft px-3.5 py-2.5 has-[:checked]:border-accent/60 has-[:checked]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="identity_mode"
                  value={m.key}
                  defaultChecked={settings.identity_mode === m.key}
                  className="accent-accent"
                />
                <span className="text-sm text-text">{m.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <label className="flex items-center justify-between text-sm text-text">
              Followers
              <input
                type="checkbox"
                name="followers_enabled"
                defaultChecked={settings.followers_enabled}
                className="h-5 w-9 shrink-0 accent-accent"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-text">
              Following
              <input
                type="checkbox"
                name="following_enabled"
                defaultChecked={settings.following_enabled}
                className="h-5 w-9 shrink-0 accent-accent"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-text">
              Profile pictures
              <input
                type="checkbox"
                name="profile_pictures_enabled"
                defaultChecked={settings.profile_pictures_enabled}
                className="h-5 w-9 shrink-0 accent-accent"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-text-faint">
            Private account information (email, real name) always stays separate from whatever public identity is
            selected here.
          </p>
        </section>

        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110 self-start"
        >
          SAVE SETTINGS
        </button>
      </form>
    </div>
  );
}
