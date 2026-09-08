"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { compactNumber } from "@/lib/format";
import { toggleReactionAction, toggleBookmarkAction, toggleRepostAction } from "@/app/actions";

export default function PostActions({
  postId,
  path,
  replyCount,
  reactionCount,
  repostCount,
  bookmarkCount,
  viewerReacted,
  viewerBookmarked,
  viewerReposted,
}: {
  postId: string;
  path: string;
  replyCount: number;
  reactionCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewerReacted: boolean;
  viewerBookmarked: boolean;
  viewerReposted: boolean;
}) {
  const [, startTransition] = useTransition();
  const [burst, setBurst] = useState(false);

  const [reaction, setReaction] = useOptimistic(
    { active: viewerReacted, count: reactionCount },
    (_state, active: boolean) => ({ active, count: reactionCount + (active ? 1 : -1) })
  );
  const [bookmark, setBookmark] = useOptimistic(
    { active: viewerBookmarked, count: bookmarkCount },
    (_state, active: boolean) => ({ active, count: bookmarkCount + (active ? 1 : -1) })
  );
  const [repost, setRepost] = useOptimistic(
    { active: viewerReposted, count: repostCount },
    (_state, active: boolean) => ({ active, count: repostCount + (active ? 1 : -1) })
  );

  function onReact() {
    const next = !reaction.active;
    if (next) {
      setBurst(true);
      setTimeout(() => setBurst(false), 350);
    }
    startTransition(async () => {
      setReaction(next);
      await toggleReactionAction(postId, reaction.active, path);
    });
  }

  function onBookmark() {
    startTransition(async () => {
      setBookmark(!bookmark.active);
      await toggleBookmarkAction(postId, bookmark.active, path);
    });
  }

  function onRepost() {
    startTransition(async () => {
      setRepost(!repost.active);
      await toggleRepostAction(postId, repost.active, path);
    });
  }

  return (
    <div className="mt-3 flex max-w-md items-center justify-between text-text-faint">
      <Link
        href={`/post/${postId}`}
        className="group flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:text-accent-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ReplyIcon className="h-[18px] w-[18px] transition group-hover:-translate-x-0.5" />
        <span className="tabular">{compactNumber(replyCount)}</span>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRepost();
        }}
        className={`group flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:text-yes ${
          repost.active ? "text-yes" : ""
        }`}
      >
        <RepostIcon className="h-[18px] w-[18px] transition group-active:rotate-[360deg]" />
        <span className="tabular">{compactNumber(repost.count)}</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReact();
        }}
        className={`group flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:text-[#fb7185] ${
          reaction.active ? "text-[#fb7185]" : ""
        }`}
      >
        <HeartIcon
          filled={reaction.active}
          className={`h-[18px] w-[18px] transition ${burst ? "animate-burst" : ""}`}
        />
        <span className="tabular">{compactNumber(reaction.count)}</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBookmark();
        }}
        className={`group flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:text-accent-2 ${
          bookmark.active ? "text-accent-2" : ""
        }`}
      >
        <BookmarkIcon filled={bookmark.active} className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
          } catch {
            /* ignore */
          }
        }}
        className="group flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:text-text-dim"
      >
        <ShareIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

function ReplyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RepostIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M7 7h10v4M17 17H7v-4M4 10l3-3 3 3M20 14l-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HeartIcon({ filled, ...props }: React.SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 20s-7-4.35-9.5-8.5C.7 8 2.3 4.8 5.6 4.2 8 3.8 10 5 12 7.3 14 5 16 3.8 18.4 4.2c3.3.6 4.9 3.8 3.1 7.3C19 15.65 12 20 12 20Z" />
    </svg>
  );
}
function BookmarkIcon({ filled, ...props }: React.SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.7 7.6-4.4M8.2 13.3l7.6 4.4" strokeLinecap="round" />
    </svg>
  );
}
