import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchFeed } from "@/lib/queries";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const rawPosts = await fetchFeed(supabase, { limit: 50 });
  const posts = await attachViewerState(supabase, user!.id, rawPosts);

  return (
    <div>
      <div className="hidden border-b border-border-soft px-5 py-4 lg:block">
        <h1 className="text-xl font-bold text-text">Home</h1>
        <p className="mt-0.5 text-sm text-text-faint">What&apos;s the gist? 👀</p>
      </div>

      <Composer profile={profile as Profile} redirectTo="/home" />

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🕳️</p>
          <p className="mt-3 font-semibold text-text">It&apos;s quiet down here.</p>
          <p className="mt-1 text-sm">Be the first to drop something.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path="/home" />)
      )}
    </div>
  );
}
