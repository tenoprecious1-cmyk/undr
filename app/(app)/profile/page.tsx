import { createClient } from "@/lib/supabase/server";
import {
  attachViewerState,
  fetchFeed,
  fetchLikedPosts,
  fetchProfileStats,
  fetchRepliesByAuthor,
} from "@/lib/queries";
import PostCard from "@/components/PostCard";
import { identityHandle } from "@/lib/types";
import type { Profile } from "@/lib/types";
import UserBadges from "@/components/UserBadges";
import ProfileBadgesSection from "@/components/ProfileBadgesSection";
import { fetchUserBadges } from "@/lib/queries";

export default async function ProfilePage(props: PageProps<"/profile">) {
  const searchParams = await props.searchParams;
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : "posts";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const stats = await fetchProfileStats(supabase, user!.id);
  const earnedBadges = await fetchUserBadges(supabase, user!.id);

  let posts =
    tab === "replies"
      ? await fetchRepliesByAuthor(supabase, user!.id)
      : tab === "likes"
        ? await fetchLikedPosts(supabase, user!.id)
        : await fetchFeed(supabase, { authorId: user!.id, limit: 60 });
  posts = await attachViewerState(supabase, user!.id, posts);

  const joined = new Date(profile!.joined_at);
  const monthsAgo = Math.max(
    0,
    Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-6">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-3xl">
            {profile!.emoji}
          </span>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-bold text-text">
              {identityHandle(profile!)}
              <UserBadges profile={profile!} size="md" />
            </h1>
            <p className="text-sm text-text-faint">
              {monthsAgo === 0 ? "Joined this month" : `Joined ${monthsAgo}mo ago`}
              {profile!.level ? ` · ${profile!.level}` : ""}
              {profile!.faculty ? ` · ${profile!.faculty}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-5 text-sm">
          <span className="text-text-dim">
            <b className="tabular text-text">{stats.posts}</b> Posts
          </span>
          <span className="text-text-dim">
            <b className="tabular text-text">{stats.reactions}</b> Reactions
          </span>
          <span className="text-text-dim">
            <b className="tabular text-text">{stats.replies}</b> Replies
          </span>
        </div>

        <ProfileBadgesSection profile={profile!} badges={earnedBadges} />
      </div>

      <div className="flex border-b border-border-soft">
        {[
          { key: "posts", label: "Posts" },
          { key: "replies", label: "Replies" },
          { key: "likes", label: "Likes" },
        ].map((t) => (
          <a
            key={t.key}
            href={`/profile?tab=${t.key}`}
            className={`flex-1 py-3 text-center text-sm font-semibold transition ${
              tab === t.key
                ? "border-b-2 border-accent text-text"
                : "text-text-faint hover:text-text-dim"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🕳️</p>
          <p className="mt-3 font-semibold text-text">Nothing here yet.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path={`/profile?tab=${tab}`} />)
      )}
    </div>
  );
}
