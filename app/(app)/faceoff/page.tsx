import { createClient } from "@/lib/supabase/server";
import { fetchLiveFaceOff, isFeatureEnabled } from "@/lib/queries";
import FaceOffCard from "@/components/FaceOffCard";
import ComingSoon from "@/components/ComingSoon";

export default async function FaceOffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enabled = await isFeatureEnabled(supabase, "faceoff");
  if (!enabled) {
    return (
      <ComingSoon
        emoji="⚔️"
        title="Friday Face-Off"
        description="Every Friday, UNDR hosts the campus's biggest debate. Pick YES or NO, become a featured speaker, and watch the results roll in live."
      />
    );
  }

  const faceoff = await fetchLiveFaceOff(supabase, user?.id ?? null);

  if (!faceoff) {
    return (
      <ComingSoon
        emoji="⚔️"
        title="Friday Face-Off"
        description="Every Friday, UNDR hosts the campus's biggest debate. Pick YES or NO, become a featured speaker, and watch the results roll in live. Nothing live right now — check back Friday."
      />
    );
  }

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">⚔️ Face-Off</h1>
        <p className="mt-0.5 text-sm text-text-faint">The campus's biggest debate. One question, two sides.</p>
      </div>

      <FaceOffCard faceoff={faceoff} />

      <div className="px-5 py-10 text-center text-sm text-text-faint">
        Results update live as votes come in. New Face-Offs drop most Fridays.
      </div>
    </div>
  );
}
