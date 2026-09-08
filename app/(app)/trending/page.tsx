import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchTrendingFeed, fetchTrendingHashtags } from "@/lib/queries";
import PostCard from "@/components/PostCard";
import { compactNumber } from "@/lib/format";

export default async function TrendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hashtags = await fetchTrendingHashtags(supabase, 12);
  let posts = await fetchTrendingFeed(supabase, 30);
  posts = await attachViewerState(supabase, user?.id ?? null, posts);

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">🔥 What&apos;s Hot</h1>
        <p className="mt-0.5 text-sm text-text-faint">The topics and posts moving UNDR right now.</p>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-border-soft px-4 py-3">
        {hashtags.map((h, i) => (
          <Link
            key={h.id}
            href={`/hashtag/${h.tag}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border-soft bg-surface/50 px-3.5 py-2 text-sm transition hover:border-accent/50"
          >
            <span className="font-mono text-xs text-text-faint">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-semibold text-text">#{h.tag}</span>
            <span className="text-xs text-text-faint tabular">{compactNumber(h.post_count)}</span>
          </Link>
        ))}
        {hashtags.length === 0 && <p className="px-2 py-1 text-sm text-text-faint">No trends yet.</p>}
      </div>

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🔥</p>
          <p className="mt-3 font-semibold text-text">Nothing trending yet.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path="/trending" />)
      )}
    </div>
  );
}
