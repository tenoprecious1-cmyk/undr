import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchFeed } from "@/lib/queries";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import type { Profile } from "@/lib/types";

export default async function ChaosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  let posts = await fetchFeed(supabase, { category: "chaos", limit: 50 });
  posts = await attachViewerState(supabase, user!.id, posts);

  return (
    <div>
      <div className="border-b border-border-soft bg-gradient-to-b from-chaos-soft/40 to-transparent px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">😂 Chaos</h1>
        <p className="mt-0.5 text-sm text-text-dim">
          Memes, campus jokes, and the stuff that isn&apos;t supposed to be serious.
        </p>
      </div>

      <Composer
        profile={{ ...(profile as Profile) }}
        redirectTo="/chaos"
        placeholder="What's the chaos? 😭"
        defaultCategory="chaos"
        compact
      />

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">😭</p>
          <p className="mt-3 font-semibold text-text">No chaos yet. Suspicious.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path="/chaos" />)
      )}
    </div>
  );
}
