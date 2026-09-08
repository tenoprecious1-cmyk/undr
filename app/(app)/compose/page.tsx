import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/queries";
import Composer from "@/components/Composer";
import type { Profile } from "@/lib/types";

export default async function ComposePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const chaosEnabled = await isFeatureEnabled(supabase, "chaos");

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
        <Link href="/home" className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
          ✕
        </Link>
        <h1 className="text-[15px] font-bold text-text">Drop something</h1>
      </div>
      <Composer profile={profile as Profile} redirectTo="/home" chaosEnabled={chaosEnabled} />
    </div>
  );
}
