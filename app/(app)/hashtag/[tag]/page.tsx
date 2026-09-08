import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchFeed } from "@/lib/queries";
import PostCard from "@/components/PostCard";
import { compactNumber } from "@/lib/format";

export default async function HashtagPage(props: PageProps<"/hashtag/[tag]">) {
  const { tag } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tagRow } = await supabase
    .from("hashtags")
    .select("tag, post_count")
    .eq("tag", tag.toLowerCase())
    .maybeSingle();

  let posts = await fetchFeed(supabase, { hashtag: tag, limit: 50 });
  posts = await attachViewerState(supabase, user?.id ?? null, posts);

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="text-xl font-bold text-text">#{tag}</h1>
        <p className="mt-0.5 text-sm text-text-faint tabular">
          {compactNumber(tagRow?.post_count ?? posts.length)} posts
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🏷️</p>
          <p className="mt-3 font-semibold text-text">Nothing under #{tag} yet.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path={`/hashtag/${tag}`} />)
      )}
    </div>
  );
}
