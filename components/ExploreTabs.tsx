import Link from "next/link";

const TABS = [
  { key: "trending", label: "🔥 Trending" },
  { key: "fresh", label: "🆕 Fresh" },
  { key: "chaos", label: "😂 Chaos" },
  { key: "polls", label: "📊 Polls" },
  { key: "hashtags", label: "🏷️ Hashtags" },
  { key: "people", label: "🔎 People" },
];

export default function ExploreTabs({ active }: { active: string }) {
  return (
    <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border-soft px-3 py-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/explore?tab=${t.key}`}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
            active === t.key ? "bg-surface text-text" : "text-text-faint hover:text-text-dim"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
