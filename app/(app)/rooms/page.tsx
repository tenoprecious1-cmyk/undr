import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchRooms, isFeatureEnabled } from "@/lib/queries";
import { compactNumber, timeLeft } from "@/lib/format";
import ComingSoon from "@/components/ComingSoon";

export default async function RoomsPage() {
  const supabase = await createClient();

  const enabled = await isFeatureEnabled(supabase, "rooms");
  if (!enabled) {
    return (
      <ComingSoon
        emoji="💬"
        title="Rooms"
        description="Temporary text rooms for whatever's popping off on campus. They disappear when the topic dies."
      />
    );
  }

  const rooms = await fetchRooms(supabase);

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">💬 Rooms</h1>
        <p className="mt-0.5 text-sm text-text-faint">
          Temporary text rooms for whatever&apos;s popping off. They disappear when the topic dies.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">💬</p>
          <p className="mt-3 font-semibold text-text">No rooms open right now.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="flex items-center gap-3.5 border-b border-border-soft px-5 py-4 transition hover:bg-surface/40"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-xl">
                {room.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{room.name}</p>
                {room.topic && <p className="truncate text-sm text-text-dim">{room.topic}</p>}
                <p className="mt-0.5 text-xs text-text-faint tabular">
                  {compactNumber(room.message_count)} messages · {timeLeft(room.expires_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
