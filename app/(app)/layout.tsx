import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchFeatureFlags,
  fetchLiveFaceOff,
  fetchPlatformSettings,
  fetchTrendingHashtags,
  fetchUnreadNotificationCount,
} from "@/lib/queries";
import { isAnyAdmin } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TrendingSidebar from "@/components/TrendingSidebar";
import OnboardingTour from "@/components/OnboardingTour";
import PreLaunchLock from "@/components/PreLaunchLock";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  if (profile.is_banned) {
    await supabase.auth.signOut();
    redirect("/login?banned=1");
  }

  const [hashtags, unreadCount, faceoff, showAdminNav, settings, flags] = await Promise.all([
    fetchTrendingHashtags(supabase, 8),
    fetchUnreadNotificationCount(supabase, user.id),
    fetchLiveFaceOff(supabase, user.id),
    isAnyAdmin(supabase, user.id),
    fetchPlatformSettings(supabase),
    fetchFeatureFlags(supabase),
  ]);

  const faceoffEnabled = flags.faceoff ?? true;
  const roomsEnabled = flags.rooms ?? true;

  if (settings?.mode === "pre_launch" && !showAdminNav) {
    return (
      <PreLaunchLock
        counter={settings.launch_counter ?? 902}
        showCounter={settings.prelaunch_counter_enabled ?? true}
      />
    );
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-[1280px] justify-center">
      <Sidebar profile={profile as Profile} unreadCount={unreadCount} isAdmin={showAdminNav} />
      <main className="min-h-dvh w-full max-w-[620px] border-x border-border-soft pb-20 lg:pb-0">
        <div className="sticky top-0 z-20 glass flex items-center justify-between border-b border-border-soft px-4 py-3 lg:hidden">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span>🕳️</span> UNDR
          </span>
          <Link href="/notifications" className="relative grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
            🔔
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent" />
            )}
          </Link>
        </div>
        {children}
      </main>
      <TrendingSidebar hashtags={hashtags} faceoff={faceoff} faceoffEnabled={faceoffEnabled} />
      <MobileNav />
      <OnboardingTour
        status={profile.onboarding_tour_status}
        faceoffEnabled={faceoffEnabled}
        roomsEnabled={roomsEnabled}
      />
    </div>
  );
}
