import { createClient } from "@/lib/supabase/server";
import { fetchRooms } from "@/lib/queries";
import { compactNumber, timeLeft } from "@/lib/format";
import { adminCreateRoomAction, adminDeleteRoomAction } from "@/app/actions";

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const rooms = await fetchRooms(supabase);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Rooms</h1>
      <p className="mt-1 text-sm text-text-faint">Spin up a temporary room.</p>

      <form
        action={adminCreateRoomAction}
        className="mt-6 flex flex-col gap-2 rounded-2xl border border-border-soft bg-surface/40 p-4"
      >
        <div className="flex gap-2">
          <input
            name="emoji"
            defaultValue="💬"
            maxLength={4}
            className="w-16 rounded-xl border border-border bg-transparent px-3 py-2 text-center text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            name="name"
            required
            placeholder="Room name"
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <input
          name="topic"
          placeholder="Topic (optional)"
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-faint">Lasts</label>
          <select
            name="hours"
            defaultValue="24"
            className="rounded-xl border border-border bg-transparent px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="6">6h</option>
            <option value="24">24h</option>
            <option value="48">2 days</option>
            <option value="168">1 week</option>
          </select>
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          Create room
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface/40 p-3">
            <span className="text-xl">{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{r.name}</p>
              <p className="text-xs text-text-faint tabular">
                {compactNumber(r.message_count)} messages · {timeLeft(r.expires_at)}
              </p>
            </div>
            <form action={adminDeleteRoomAction.bind(null, r.id)}>
              <button
                type="submit"
                className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
        {rooms.length === 0 && <p className="text-sm text-text-faint">No active rooms.</p>}
      </div>
    </div>
  );
}
