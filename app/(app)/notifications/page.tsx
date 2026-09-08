import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchNotifications } from "@/lib/queries";
import { identityHandle } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { markNotificationsReadAction } from "@/app/actions";
import type { Notification } from "@/lib/types";
import UserBadges from "@/components/UserBadges";

const COPY: Record<Notification["type"], string> = {
  reaction: "reacted to your post",
  reply: "replied to your post",
  repost: "reposted your post",
  faceoff: "",
  system: "",
};

const ICON: Record<Notification["type"], string> = {
  reaction: "❤️",
  reply: "💬",
  repost: "🔁",
  faceoff: "⚔️",
  system: "🔔",
};

function notificationHref(n: Notification): string {
  if (n.post_id) return `/post/${n.post_id}`;
  if (n.faceoff_id) return "/faceoff";
  return "/notifications";
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notifications = await fetchNotifications(supabase, user!.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">🔔 Notifications</h1>
          <p className="mt-0.5 text-sm text-text-faint">Replies, reactions, and Face-Off pings.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markNotificationsReadAction}>
            <button
              type="submit"
              className="rounded-full border border-border-soft px-3.5 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🔔</p>
          <p className="mt-3 font-semibold text-text">Nothing yet.</p>
          <p className="mt-1 text-sm">Replies, reactions, and Face-Off pings will show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={notificationHref(n)}
              className={`flex items-start gap-3 border-b border-border-soft px-5 py-4 transition hover:bg-surface/40 ${
                n.is_read ? "" : "bg-accent-soft/20"
              }`}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-base">
                {ICON[n.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text">
                  {n.actor ? (
                    <>
                      <span className="font-semibold">{identityHandle(n.actor)}</span>
                      <UserBadges profile={n.actor} />{" "}
                      {COPY[n.type]}
                    </>
                  ) : (
                    n.message
                  )}
                </p>
                <p className="mt-0.5 text-xs text-text-faint">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
