import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  attachViewerState,
  fetchFeed,
  fetchPolls,
  fetchProfileStats,
  fetchTrendingFeed,
  fetchTrendingHashtags,
  isFeatureEnabled,
  searchProfiles,
} from "@/lib/queries";
import PostCard from "@/components/PostCard";
import ExploreTabs from "@/components/ExploreTabs";
import UserBadges from "@/components/UserBadges";
import { identityHandle } from "@/lib/types";
import { compactNumber } from "@/lib/format";

export default async function ExplorePage(props: PageProps<"/explore">) {
  const searchParams = await props.searchParams;
  let tab = typeof searchParams.tab === "string" ? searchParams.tab : "trending";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chaosEnabled = await isFeatureEnabled(supabase, "chaos");
  if (tab === "chaos" && !chaosEnabled) tab = "trending";

  let content: React.ReactNode;

  if (tab === "people") {
    const q = typeof searchParams.q === "string" ? searchParams.q : "";
    const people = q ? await searchProfiles(supabase, q, 20) : [];
    const withStats = await Promise.all(
      people.map(async (p) => ({ profile: p, stats: await fetchProfileStats(supabase, p.id) }))
    );

    content = (
      <div className="p-4">
        <form action="/explore" method="get" className="flex gap-2">
          <input type="hidden" name="tab" value="people" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search animal, tag number, level…"
            className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          {withStats.map(({ profile: p, stats }) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface/40 px-4 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-text">
                  {identityHandle(p)}
                  <UserBadges profile={p} />
                </p>
                <p className="text-xs text-text-faint tabular">{stats.posts} posts</p>
              </div>
            </div>
          ))}
          {q && withStats.length === 0 && (
            <p className="py-10 text-center text-text-faint">No one matches &ldquo;{q}&rdquo;.</p>
          )}
          {!q && <p className="py-10 text-center text-text-faint">Search for someone on UNDR.</p>}
        </div>
      </div>
    );
  } else if (tab === "hashtags") {
    const hashtags = await fetchTrendingHashtags(supabase, 60);
    content = (
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        {hashtags.map((h) => (
          <Link
            key={h.id}
            href={`/hashtag/${h.tag}`}
            className="rounded-2xl border border-border-soft bg-surface/50 px-4 py-3.5 transition hover:border-accent/50 hover:bg-surface"
          >
            <p className="font-semibold text-accent-2">#{h.tag}</p>
            <p className="mt-0.5 text-xs text-text-faint tabular">{compactNumber(h.post_count)} posts</p>
          </Link>
        ))}
        {hashtags.length === 0 && (
          <p className="col-span-full py-10 text-center text-text-faint">No hashtags yet.</p>
        )}
      </div>
    );
  } else {
    let posts =
      tab === "fresh"
        ? await fetchFeed(supabase, { limit: 50 })
        : tab === "chaos"
          ? await fetchFeed(supabase, { category: "chaos", limit: 50 })
          : tab === "polls"
            ? await fetchPolls(supabase, 50)
            : await fetchTrendingFeed(supabase, 50);

    posts = await attachViewerState(supabase, user?.id ?? null, posts);

    content =
      posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">👀</p>
          <p className="mt-3 font-semibold text-text">Nothing here yet.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} path={`/explore?tab=${tab}`} />)
      );
  }

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="text-xl font-bold text-text">Explore</h1>
        <p className="mt-0.5 text-sm text-text-faint">What&apos;s happening on campus right now 👀</p>
      </div>
      <ExploreTabs active={tab} chaosEnabled={chaosEnabled} />
      {content}
    </div>
  );
}
