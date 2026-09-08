import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  fetchBadgeAuditLog,
  fetchBadgeCatalog,
  fetchBadgeStats,
  fetchUserBadgeAuditLog,
  fetchUserBadges,
  searchProfiles,
} from "@/lib/queries";
import { identityHandle } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import UserBadges from "@/components/UserBadges";
import GoldBadgeIcon from "@/components/badges/GoldBadge";
import VerifiedBadgeIcon from "@/components/badges/VerifiedBadge";
import {
  adminAwardBadgeAction,
  adminAwardGoldAction,
  adminRevokeBadgeAction,
  adminRevokeGoldAction,
  adminSetVerificationAction,
} from "@/app/actions";

const VERIFICATION_STATES = ["not_verified", "pending", "verified", "revoked"] as const;

const ACTION_LABEL: Record<string, string> = {
  gold_awarded: "🥇 Gold awarded",
  gold_revoked: "🥇 Gold revoked",
  verification_changed: "🔷 Verification changed",
  badge_awarded: "🏅 Badge awarded",
  badge_revoked: "🏅 Badge revoked",
};

export default async function AdminBadgesPage(props: PageProps<"/admin/badges">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const userId = typeof searchParams.user === "string" ? searchParams.user : "";

  const supabase = await createClient();

  const [stats, catalog] = await Promise.all([fetchBadgeStats(supabase), fetchBadgeCatalog(supabase)]);

  const results = q ? await searchProfiles(supabase, q, 12) : [];

  let selected: Profile | null = null;
  let selectedBadges: Awaited<ReturnType<typeof fetchUserBadges>> = [];
  let selectedHistory: Awaited<ReturnType<typeof fetchUserBadgeAuditLog>> = [];
  if (userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
    selected = data;
    if (selected) {
      [selectedBadges, selectedHistory] = await Promise.all([
        fetchUserBadges(supabase, userId),
        fetchUserBadgeAuditLog(supabase, userId, 20),
      ]);
    }
  }

  const globalHistory = userId ? [] : await fetchBadgeAuditLog(supabase, 25);
  const heldKeys = new Set(selectedBadges.map((b) => b.badge_key));

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Badge Management</h1>
      <p className="mt-1 text-sm text-text-faint">Verified status, UNDR Gold, and achievement badges.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border-soft bg-surface/40 p-4 text-center">
          <VerifiedBadgeIcon className="mx-auto h-6 w-6" />
          <p className="mt-2 text-2xl font-bold tabular text-text">{stats.verifiedCount}</p>
          <p className="text-xs text-text-faint">Verified accounts</p>
        </div>
        <div className="rounded-2xl border border-border-soft bg-surface/40 p-4 text-center">
          <GoldBadgeIcon className="mx-auto h-6 w-6" />
          <p className="mt-2 text-2xl font-bold tabular text-text">{stats.goldCount}</p>
          <p className="text-xs text-text-faint">Gold members</p>
        </div>
        <div className="rounded-2xl border border-border-soft bg-surface/40 p-4 text-center">
          <span className="mx-auto block text-lg">🏅</span>
          <p className="mt-2 text-2xl font-bold tabular text-text">{stats.achievementCount}</p>
          <p className="text-xs text-text-faint">Achievement badges</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border-soft bg-surface/40 p-4">
        <p className="text-sm font-bold text-text">＋ Award / manage a user</p>
        <form action="/admin/badges" method="get" className="mt-3 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by animal, tag number, level…"
            className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Search
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {results.map((p) => (
              <Link
                key={p.id}
                href={`/admin/badges?user=${p.id}`}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
                  userId === p.id
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border-soft hover:border-accent/40 hover:bg-surface/60"
                }`}
              >
                <span className="text-lg">{p.emoji}</span>
                <span className="font-semibold text-text">{identityHandle(p)}</span>
                <UserBadges profile={p} />
                <span className="ml-auto text-xs text-text-faint">{p.level ?? "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-6 rounded-2xl border border-border-soft bg-surface/40 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-2xl">
              {selected.emoji}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-base font-bold text-text">
                {identityHandle(selected)}
                <UserBadges profile={selected} size="md" />
              </p>
              <p className="text-xs text-text-faint">
                {selected.level ?? "—"} {selected.faculty ? `· ${selected.faculty}` : ""}
              </p>
            </div>
          </div>

          {/* Verification */}
          <div className="mt-5 border-t border-border-soft pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Verification status</p>
            <form action={adminSetVerificationAction} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="user_id" value={selected.id} />
              <select
                name="status"
                defaultValue={selected.verification_status}
                className="rounded-full border border-border bg-bg px-3.5 py-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {VERIFICATION_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full border border-border-soft px-4 py-2 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
              >
                Update status
              </button>
            </form>
            <p className="mt-1.5 text-xs text-text-faint">
              The 🔷 badge only shows publicly when status is <b>verified</b>.
            </p>
          </div>

          {/* Gold */}
          <div className="mt-5 border-t border-border-soft pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">UNDR Gold</p>
            {selected.gold_status ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-sm text-text-dim">
                  Currently Gold{selected.gold_reason ? ` — "${selected.gold_reason}"` : ""}
                </span>
                <form action={adminRevokeGoldAction.bind(null, selected.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
                  >
                    Revoke Gold
                  </button>
                </form>
              </div>
            ) : (
              <form action={adminAwardGoldAction} className="mt-2 flex flex-col gap-2.5">
                <input type="hidden" name="user_id" value={selected.id} />
                <textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="Reason (required) — e.g. Exceptional contribution to UNDR"
                  className="w-full resize-none rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
                <label className="flex items-center gap-2 text-xs text-text-dim">
                  <input type="checkbox" name="display_publicly" className="accent-[color:var(--gold)]" />
                  Display reason publicly on profile
                </label>
                <button
                  type="submit"
                  className="self-start rounded-full bg-[color:var(--gold)] px-5 py-2 text-sm font-bold text-black transition hover:brightness-105"
                >
                  Award UNDR Gold
                </button>
              </form>
            )}
          </div>

          {/* Achievement badges */}
          <div className="mt-5 border-t border-border-soft pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Achievement badges</p>
            <div className="mt-2 flex flex-col gap-2">
              {catalog.map((b) => {
                const held = heldKeys.has(b.key);
                return (
                  <div
                    key={b.key}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5"
                  >
                    <span className="text-lg">{b.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text">{b.name}</p>
                      <p className="text-xs text-text-faint">{b.description}</p>
                    </div>
                    {held ? (
                      <form action={adminRevokeBadgeAction.bind(null, selected.id, b.key)}>
                        <button
                          type="submit"
                          className="rounded-full border border-danger/40 px-3.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : (
                      <form action={adminAwardBadgeAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="user_id" value={selected.id} />
                        <input type="hidden" name="badge_key" value={b.key} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Reason (optional)"
                          className="w-36 rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-border-soft px-3.5 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                        >
                          Award
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* History */}
          <div className="mt-5 border-t border-border-soft pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Badge history</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {selectedHistory.length === 0 && <p className="text-xs text-text-faint">No badge actions yet.</p>}
              {selectedHistory.map((h) => (
                <div key={h.id} className="rounded-xl border border-border-soft bg-bg/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-text">
                    {ACTION_LABEL[h.action] ?? h.action}
                    {h.badge_key ? ` — ${h.badge_key}` : ""}
                  </p>
                  <p className="mt-0.5 text-text-faint">
                    {h.admin ? identityHandle(h.admin) : "unknown admin"} · {timeAgo(h.created_at)}
                    {h.reason ? ` · "${h.reason}"` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!userId && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Recent badge activity</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {globalHistory.length === 0 && <p className="text-sm text-text-faint">No badge activity yet.</p>}
            {globalHistory.map((h) => (
              <div key={h.id} className="rounded-xl border border-border-soft bg-surface/30 px-3.5 py-2.5 text-sm">
                <p className="font-semibold text-text">
                  {ACTION_LABEL[h.action] ?? h.action}
                  {h.badge_key ? ` — ${h.badge_key}` : ""} ·{" "}
                  {h.target ? identityHandle(h.target) : "unknown user"}
                </p>
                <p className="mt-0.5 text-xs text-text-faint">
                  by {h.admin ? identityHandle(h.admin) : "unknown admin"} · {timeAgo(h.created_at)}
                  {h.reason ? ` · "${h.reason}"` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
