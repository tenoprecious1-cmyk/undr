import { createClient } from "@/lib/supabase/server";
import {
  fetchLinkups,
  fetchRecentPostsForModeration,
  fetchRecentRoomMessagesForModeration,
} from "@/lib/queries";
import { identityHandle } from "@/lib/types";
import { timeAgo, timeLeft } from "@/lib/format";
import {
  adminDeleteLinkupAction,
  adminDeletePostAction,
  adminDeleteRoomMessageAction,
  adminPromotePostAction,
} from "@/app/actions";
import { can } from "@/lib/permissions";
import UserBadges from "@/components/UserBadges";

const PROMO_TYPES: { key: string; label: string }[] = [
  { key: "featured", label: "🔥 Featured by UNDR" },
  { key: "admin_pick", label: "⭐ Admin Pick" },
  { key: "pinned", label: "📌 Pinned" },
  { key: "trending", label: "🔥 Trending" },
  { key: "drop_of_day", label: "🏆 Drop of the Day" },
];

export default async function AdminModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [posts, messages, linkups, canFeature] = await Promise.all([
    fetchRecentPostsForModeration(supabase, 30),
    fetchRecentRoomMessagesForModeration(supabase, 30),
    fetchLinkups(supabase, null),
    can(supabase, user?.id, "manage_content"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Moderation</h1>
      <p className="mt-1 text-sm text-text-faint">Delete anything that breaks the rules.</p>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-text-faint">Recent posts</h2>
      <div className="mt-2 flex flex-col gap-2">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-border-soft bg-surface/40 p-3">
            <div className="min-w-0 flex-1 basis-full sm:basis-0">
              <p className="flex flex-wrap items-center gap-1 text-xs text-text-faint">
                {identityHandle(p.author)} <UserBadges profile={p.author} /> · {timeAgo(p.created_at)} · {p.category}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text">{p.content}</p>
            </div>
            {canFeature && (
              <form action={adminPromotePostAction} className="flex flex-wrap shrink-0 items-center gap-1.5">
                <input type="hidden" name="post_id" value={p.id} />
                <select
                  name="promo_type"
                  defaultValue=""
                  className="rounded-full border border-border-soft bg-surface px-2.5 py-2 text-xs text-text-dim focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    Feature as…
                  </option>
                  {PROMO_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                >
                  Apply
                </button>
              </form>
            )}
            <form action={adminDeletePostAction.bind(null, p.id)}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-danger/40 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-text-faint">No posts yet.</p>}
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-text-faint">Recent room messages</h2>
      <div className="mt-2 flex flex-col gap-2">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-3 rounded-2xl border border-border-soft bg-surface/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs text-text-faint">
                {identityHandle(m.author)} <UserBadges profile={m.author} /> · {timeAgo(m.created_at)} · in{" "}
                {m.room?.name ?? "a room"}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text">{m.content}</p>
            </div>
            <form action={adminDeleteRoomMessageAction.bind(null, m.id)}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-danger/40 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-text-faint">No messages yet.</p>}
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-text-faint">Active link-ups</h2>
      <div className="mt-2 flex flex-col gap-2">
        {linkups.map((l) => (
          <div key={l.id} className="flex items-start gap-3 rounded-2xl border border-border-soft bg-surface/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs text-text-faint">
                {identityHandle(l.author)} <UserBadges profile={l.author} /> · {timeAgo(l.created_at)} ·{" "}
                {timeLeft(l.expires_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text">
                {l.vibe_emoji} {l.activity}
                {l.location ? ` · ${l.location}` : ""}
              </p>
            </div>
            <form action={adminDeleteLinkupAction.bind(null, l.id)}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-danger/40 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
        {linkups.length === 0 && <p className="text-sm text-text-faint">No active link-ups.</p>}
      </div>
    </div>
  );
}
