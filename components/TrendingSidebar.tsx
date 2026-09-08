import Link from "next/link";
import { compactNumber } from "@/lib/format";
import type { FaceOff, Hashtag } from "@/lib/types";

export default function TrendingSidebar({
  hashtags,
  faceoff,
  faceoffEnabled = true,
}: {
  hashtags: Hashtag[];
  faceoff?: FaceOff | null;
  faceoffEnabled?: boolean;
}) {
  return (
    <aside className="hidden xl:flex sticky top-0 h-dvh w-80 shrink-0 flex-col gap-4 overflow-y-auto px-4 py-6">
      <div className="rounded-2xl border border-border-soft bg-surface/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-text">
          <span>🔥</span> WHAT&apos;S HOT
        </h2>
        <ol className="flex flex-col">
          {hashtags.length === 0 && (
            <li className="py-4 text-sm text-text-faint">Nothing trending yet. Drop something.</li>
          )}
          {hashtags.map((h, i) => (
            <li key={h.id}>
              <Link
                href={`/hashtag/${h.tag}`}
                className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-4 shrink-0 font-mono text-xs text-text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-text group-hover:text-accent-2">
                      #{h.tag}
                    </span>
                    <span className="block text-xs text-text-faint tabular">
                      {compactNumber(h.post_count)} posts
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {faceoffEnabled && (
      <div className="rounded-2xl border border-border-soft bg-gradient-to-br from-accent-soft to-transparent p-4">
        <h2 className="mb-1.5 flex items-center gap-2 text-[15px] font-bold text-text">
          <span>⚔️</span> FACE-OFF
        </h2>
        {faceoff ? (
          <>
            <p className="text-sm font-medium text-text">{faceoff.question}</p>
            <p className="mt-1 text-xs text-text-faint tabular">
              {compactNumber(faceoff.yes_count + faceoff.no_count)} votes so far
            </p>
            <Link
              href="/faceoff"
              className="mt-3 inline-block text-sm font-semibold text-accent-2 hover:underline"
            >
              {faceoff.viewer_side ? "See live results →" : "Vote now →"}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-text-dim">
              Friday debates are coming to UNDR. Pick a side when it drops.
            </p>
            <Link
              href="/faceoff"
              className="mt-3 inline-block text-sm font-semibold text-accent-2 hover:underline"
            >
              Get notified →
            </Link>
          </>
        )}
      </div>
      )}

      <p className="px-2 pb-6 text-xs text-text-faint">
        UNDR · The other side of Bowen.
      </p>
    </aside>
  );
}
