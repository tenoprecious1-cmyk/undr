import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFeatureFlagList } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import FeatureFlagToggle from "./FeatureFlagToggle";

const CATEGORY_LABELS: Record<string, string> = {
  core_social: "Core Social",
  culture: "Culture",
};

const CATEGORY_BLURBS: Record<string, string> = {
  core_social: "The X-style feed core. Shown for visibility — not wired to hide anything yet.",
  culture: "Face-Off, Rooms, Chaos, and drop features. Off by default at launch — flip on when ready.",
};

export default async function FeatureControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await can(supabase, user.id, "manage_platform_settings");
  if (!allowed) redirect("/admin");

  const flags = await fetchFeatureFlagList(supabase);
  const byCategory = flags.reduce<Record<string, typeof flags>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl">
      <Link href="/admin/control" className="text-sm text-text-faint hover:text-text">
        ← UNDR Control
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text">Feature Control</h1>
      <p className="mt-1 text-sm text-text-faint">
        Toggle feature visibility across UNDR without a redeploy. Culture features are hidden from students by
        default until you turn them on here.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {Object.entries(byCategory).map(([category, categoryFlags]) => (
          <section key={category} className="rounded-2xl border border-border-soft bg-surface/50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <p className="mt-1 text-xs text-text-faint">{CATEGORY_BLURBS[category]}</p>

            <div className="mt-4 flex flex-col gap-1.5">
              {categoryFlags.map((flag) => (
                <FeatureFlagToggle key={flag.key} flagKey={flag.key} initialEnabled={flag.enabled} name={flag.name} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-xs text-text-faint">
        Face-Off, Rooms, and Chaos are the only culture flags wired to actually hide UI right now. UNDR Pulse,
        Random Drop, and Drop of the Day toggle in the database but have no feature behind them yet.
      </p>
    </div>
  );
}
