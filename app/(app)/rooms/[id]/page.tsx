import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRoom, fetchRoomMessages, isFeatureEnabled } from "@/lib/queries";
import { identityHandle } from "@/lib/types";
import { timeAgo, timeLeft } from "@/lib/format";
import RoomMessageForm from "@/components/RoomMessageForm";
import UserBadges from "@/components/UserBadges";
import ComingSoon from "@/components/ComingSoon";

export default async function RoomDetailPage(props: PageProps<"/rooms/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const enabled = await isFeatureEnabled(supabase, "rooms");
  if (!enabled) {
    return <ComingSoon emoji="💬" title="Rooms" description="Rooms aren't open right now." />;
  }

  const room = await fetchRoom(supabase, id);
  if (!room) notFound();

  const messages = await fetchRoomMessages(supabase, id);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/rooms" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <span className="text-xl">{room.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold text-text">{room.name}</h1>
          <p className="truncate text-xs text-text-faint">{timeLeft(room.expires_at)}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {messages.length === 0 ? (
          <div className="px-6 py-16 text-center text-text-faint">
            <p className="text-3xl">👀</p>
            <p className="mt-3 font-semibold text-text">Quiet in here. Break the ice.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm">
                  {m.author.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 text-xs">
                    <span className="font-semibold text-text">{identityHandle(m.author)}</span>
                    <UserBadges profile={m.author} />
                    <span className="text-text-faint">· {timeAgo(m.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-text">
                    {m.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RoomMessageForm roomId={room.id} />
    </div>
  );
}
