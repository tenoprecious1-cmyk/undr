"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";
import { identityHandle, PROMO_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import PostActions from "./PostActions";
import PollBlock from "./PollBlock";
import UserBadges from "./UserBadges";

function renderContent(content: string) {
  const parts = content.split(/(#[A-Za-z0-9_]{2,50})/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <Link
          key={i}
          href={`/hashtag/${part.slice(1).toLowerCase()}`}
          className="text-accent-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PostCard({ post, path = "/home" }: { post: Post; path?: string }) {
  const isChaos = post.category === "chaos";
  const router = useRouter();

  return (
    <article
      className={`animate-pop-in border-b border-border-soft px-4 py-4 transition-colors hover:bg-surface/40 sm:px-5 ${
        isChaos ? "bg-chaos-soft/20" : ""
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
            isChaos ? "bg-chaos-soft" : "bg-accent-soft"
          }`}
        >
          {post.author.emoji}
        </span>

        <div className="min-w-0 flex-1">
          {post.promotion && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-2">
              {PROMO_LABELS[post.promotion.promo_type]}
            </p>
          )}
          <div
            className="block cursor-pointer"
            onClick={() => router.push(`/post/${post.id}`)}
          >
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-semibold text-text">{identityHandle(post.author)}</span>
              <UserBadges profile={post.author} />
              {isChaos && (
                <span className="rounded-full bg-chaos/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-chaos">
                  Chaos
                </span>
              )}
              <span className="text-text-faint">· {timeAgo(post.created_at)}</span>
            </div>
            {post.content && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text">
                {renderContent(post.content)}
              </p>
            )}
          </div>

          {post.media.length > 0 && post.media[0].media_type === "video" ? (
            <div
              className="mt-2 overflow-hidden rounded-2xl border border-border-soft"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={post.media[0].url} controls className="max-h-[28rem] w-full bg-black" />
            </div>
          ) : post.media.length > 0 ? (
            <div
              className={`mt-2 grid gap-1 overflow-hidden rounded-2xl border border-border-soft ${
                post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {post.media.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={m.url}
                  alt=""
                  className={`w-full cursor-pointer object-cover ${
                    post.media.length === 1 ? "max-h-[28rem]" : "aspect-square"
                  }`}
                  onClick={() => router.push(`/post/${post.id}`)}
                />
              ))}
            </div>
          ) : null}

          {post.is_poll && post.poll_options && post.poll_options.length > 0 && (
            <PollBlock
              postId={post.id}
              path={path}
              options={post.poll_options}
              votedOptionId={post.viewer_voted_option_id ?? null}
            />
          )}

          <PostActions
            post={post}
            postId={post.id}
            path={path}
            replyCount={post.reply_count}
            reactionCount={post.reaction_count}
            repostCount={post.repost_count}
            bookmarkCount={post.bookmark_count}
            viewerReacted={post.viewer_reacted}
            viewerBookmarked={post.viewer_bookmarked}
            viewerReposted={post.viewer_reposted}
          />
        </div>
      </div>
    </article>
  );
}
