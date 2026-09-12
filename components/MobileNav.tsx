"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Home", emoji: "🏠", tour: "home" },
  { href: "/explore", label: "Explore", emoji: "🧭", tour: "explore" },
  { href: "/compose", label: "Drop", emoji: "➕", accent: true, tour: "drop" },
  { href: "/notifications", label: "Alerts", emoji: "🔔", tour: undefined },
  { href: "/profile", label: "Profile", emoji: "👤", tour: "profile" },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border-soft px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          if (item.accent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
                className="grid h-12 w-12 -translate-y-2 place-items-center rounded-full bg-accent text-xl text-white shadow-[0_8px_20px_-4px_rgba(139,92,246,0.7)] active:scale-95 transition"
              >
                {item.emoji}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.tour}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] transition-colors ${
                active ? "text-text" : "text-text-faint"
              }`}
            >
              <span className={`text-lg leading-none ${active ? "" : "opacity-70"}`}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
