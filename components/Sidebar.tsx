"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { identityHandle } from "@/lib/types";
import { logoutAction } from "@/app/actions";
import UserBadges from "./UserBadges";

// X-style core nav for V1. Face-Off / Rooms / Link Up ("culture" features) stay
// built but are left out of primary nav until the admin feature-flag system
// (Phase 3) can gate them explicitly — their routes and backend still work.
const NAV = [
  { href: "/home", label: "Home", icon: HomeIcon, tour: "home" },
  { href: "/trending", label: "Trending", icon: FireIcon, tour: "trending" },
  { href: "/explore", label: "Explore", icon: CompassIcon, tour: "explore" },
  { href: "/notifications", label: "Notifications", icon: BellIcon, tour: undefined },
  { href: "/bookmarks", label: "Bookmarks", icon: BookmarkIcon, tour: "bookmarks" },
  { href: "/profile", label: "Profile", icon: ProfileIcon, tour: "profile" },
];

export default function Sidebar({
  profile,
  unreadCount = 0,
  isAdmin = false,
  marketplaceEnabled = false,
}: {
  profile: Profile;
  unreadCount?: number;
  isAdmin?: boolean;
  marketplaceEnabled?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-64 shrink-0 flex-col justify-between px-4 py-6">
      <div>
        <Link href="/home" className="flex items-center gap-2 px-2 mb-8">
          <span className="text-2xl">🕳️</span>
          <span className="text-xl font-bold tracking-tight text-text">UNDR</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {marketplaceEnabled && (
            <Link
              href="/marketplace"
              className={`group flex items-center gap-3.5 rounded-full px-3.5 py-2.5 text-[15px] transition-colors ${
                pathname.startsWith("/marketplace")
                  ? "bg-surface text-text font-semibold"
                  : "text-text-dim hover:text-text hover:bg-surface/60"
              }`}
            >
              <ShopIcon
                className={`h-5 w-5 shrink-0 transition-colors ${
                  pathname.startsWith("/marketplace") ? "text-accent" : "text-text-faint group-hover:text-text-dim"
                }`}
              />
              Marketplace
            </Link>
          )}
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
                className={`group flex items-center gap-3.5 rounded-full px-3.5 py-2.5 text-[15px] transition-colors ${
                  active
                    ? "bg-surface text-text font-semibold"
                    : "text-text-dim hover:text-text hover:bg-surface/60"
                }`}
              >
                <span className="relative shrink-0">
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      active ? "text-accent" : "text-text-faint group-hover:text-text-dim"
                    }`}
                  />
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <Link
            href="/admin"
            className={`group mt-1 flex items-center gap-3.5 rounded-full px-3.5 py-2.5 text-[15px] transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-surface text-text font-semibold"
                : "text-text-dim hover:text-text hover:bg-surface/60"
            }`}
          >
            <ShieldIcon
              className={`h-5 w-5 shrink-0 transition-colors ${
                pathname.startsWith("/admin") ? "text-accent" : "text-text-faint group-hover:text-text-dim"
              }`}
            />
            Admin
          </Link>
        )}

        <Link
          href="/compose"
          data-tour="drop"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-[15px] font-semibold text-white shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_8px_24px_-6px_rgba(139,92,246,0.55)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <PlusIcon className="h-5 w-5" />
          Drop something
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border-soft bg-surface/60 px-3 py-3">
        <Link href="/profile" data-tour="profile" className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
            {profile.emoji}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 truncate text-sm font-semibold text-text">
              <span className="truncate">{identityHandle(profile)}</span>
              <UserBadges profile={profile} />
            </span>
            <span className="block truncate text-xs text-text-faint">{profile.level ?? "Undercover"}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Log out"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-faint transition hover:bg-surface-2 hover:text-text"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FireIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M12 3s-4 3.5-4 8a4 4 0 0 0 8 0c1.2 1 2 2.6 2 4.3a6 6 0 1 1-12 0C6 11 8 8.5 12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6 6-2Z" strokeLinejoin="round" />
    </svg>
  );
}
function SwordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3v18M6 8l12 8M18 8 6 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RoomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M4 6a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
        strokeLinejoin="round"
      />
      <path d="M15 4v5h5" strokeLinejoin="round" />
    </svg>
  );
}
function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M9 15 15 9M10 6l1-1a4 4 0 1 1 6 6l-1 1M14 18l-1 1a4 4 0 1 1-6-6l1-1"
        strokeLinecap="round"
      />
    </svg>
  );
}
function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M6 10a6 6 0 1 1 12 0c0 3.2 1 5 2 6H4c1-1 2-2.8 2-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
function ShopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2l.8 3.2a2 2 0 0 1-2 2.5H5.2a2 2 0 0 1-2-2.5L4 8Z"
        strokeLinejoin="round"
      />
      <path d="M6 13.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4.5M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BookmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round" />
    </svg>
  );
}
function ProfileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
