import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchBookmarkedPosts } from "@/lib/queries";
import PostCard from "@/components/PostCard";

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let posts = await fetchBookmarkedPosts(supabase, user!.id);
  posts = await attachViewerState(supabase, user!.id, posts);

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">🔖 Bookmarks</h1>
        <p className="mt-0.5 text-sm text-text-faint">Only you can see this.</p>
      </div>

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🔖</p>
          <p className="mt-3 font-semibold text-text">Nothing saved yet.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path="/bookmarks" />)
      )}
    </div>
  );
}
