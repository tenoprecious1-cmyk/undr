import { createClient } from "@/lib/supabase/server";
import { fetchAdminStats } from "@/lib/queries";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const stats = await fetchAdminStats(supabase);

  const cards = [
    { label: "Total users", value: stats.totalUsers, emoji: "👥" },
    { label: "Posts today", value: stats.postsToday, emoji: "📝" },
    { label: "Total posts", value: stats.totalPosts, emoji: "🗂️" },
    { label: "Active rooms", value: stats.activeRooms, emoji: "💬" },
    { label: "Active link-ups", value: stats.activeLinkups, emoji: "🤝" },
    { label: "Face-Offs run", value: stats.totalFaceoffs, emoji: "⚔️" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-text-faint">A quick pulse on UNDR.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border-soft bg-surface/50 p-4">
            <div className="text-2xl">{c.emoji}</div>
            <div className="mt-2 text-2xl font-bold text-text tabular">{c.value}</div>
            <div className="mt-0.5 text-xs text-text-faint">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
