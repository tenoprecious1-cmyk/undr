import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { attachViewerState, fetchPost, fetchReplies, isFeatureEnabled } from "@/lib/queries";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import type { Profile } from "@/lib/types";

export default async function PostDetailPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const post = await fetchPost(supabase, id);
  if (!post) notFound();

  const [withState] = await attachViewerState(supabase, user!.id, [post]);
  const rawReplies = await fetchReplies(supabase, id);
  const replies = await attachViewerState(supabase, user!.id, rawReplies);
  const chaosEnabled = await isFeatureEnabled(supabase, "chaos");

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft glass px-4 py-3">
        <Link href="/home" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ←
        </Link>
        <h1 className="text-[15px] font-bold text-text">Thread</h1>
      </div>

      <PostCard post={withState} path={`/post/${id}`} deleteRedirectTo="/home" />

      <Composer
        profile={profile as Profile}
        parentId={id}
        redirectTo={`/post/${id}`}
        placeholder="Drop a reply…"
        compact
        chaosEnabled={chaosEnabled}
      />

      {replies.length > 0 && (
        <div className="border-b border-border-soft px-4 py-2.5 text-sm font-bold text-text-dim sm:px-5">
          💬 {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
        </div>
      )}

      {replies.map((reply) => (
        <PostCard key={reply.id} post={reply} path={`/post/${id}`} />
      ))}
    </div>
  );
}
