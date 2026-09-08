import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/actions";
import { can, isAnyAdmin } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowedIn = await isAnyAdmin(supabase, user.id);
  if (!allowedIn) redirect("/home");

  const [canManagePlatform, canManageAdmins, canManageBadges] = await Promise.all([
    can(supabase, user.id, "manage_platform_settings"),
    can(supabase, user.id, "manage_admins"),
    can(supabase, user.id, "manage_badges"),
  ]);

  const NAV = [
    { href: "/admin", label: "Dashboard", show: true },
    { href: "/admin/users", label: "Users", show: true },
    { href: "/admin/badges", label: "Badges", show: canManageBadges },
    { href: "/admin/moderation", label: "Moderation", show: true },
    { href: "/admin/faceoffs", label: "Face-Offs", show: true },
    { href: "/admin/rooms", label: "Rooms", show: true },
    { href: "/admin/control", label: "UNDR Control", show: canManagePlatform },
    { href: "/admin/activity", label: "Activity Log", show: canManagePlatform || canManageAdmins },
  ].filter((item) => item.show);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="hidden sm:flex sticky top-0 h-dvh w-56 shrink-0 flex-col justify-between border-r border-border-soft px-4 py-6">
        <div>
          <Link href="/home" className="mb-8 flex items-center gap-2 px-2 text-sm text-text-faint hover:text-text">
            ← Back to UNDR
          </Link>
          <p className="mb-3 px-3.5 text-xs font-bold uppercase tracking-wide text-text-faint">Admin</p>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2.5 text-[15px] text-text-dim transition-colors hover:bg-surface/60 hover:text-text"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="px-3.5 text-sm text-text-faint hover:text-text">
            Log out
          </button>
        </form>
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border-soft glass px-4 py-3 sm:hidden">
        <Link href="/home" className="text-sm text-text-faint hover:text-text">
          ← Back
        </Link>
        <span className="text-sm font-bold text-text">Admin</span>
      </div>

      <main className="min-h-dvh w-full px-4 py-6 sm:px-8">
        <nav className="mb-6 flex gap-1 overflow-x-auto sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-border-soft px-3.5 py-1.5 text-sm text-text-dim hover:border-accent/50 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}
