import { createClient } from "@/lib/supabase/server";
import { fetchLinkups } from "@/lib/queries";
import LinkupComposer from "@/components/LinkupComposer";
import LinkupCard from "@/components/LinkupCard";

export default async function LinkUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const linkups = await fetchLinkups(supabase, user?.id ?? null);

  return (
    <div>
      <div className="border-b border-border-soft px-5 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">🤝 Link Up</h1>
        <p className="mt-0.5 text-sm text-text-faint">
          Spontaneous campus activities. Find people down to do something right now — not a dating thing.
        </p>
      </div>

      <LinkupComposer />

      {linkups.length === 0 ? (
        <div className="px-6 py-16 text-center text-text-faint">
          <p className="text-3xl">🤝</p>
          <p className="mt-3 font-semibold text-text">Nothing happening right now.</p>
          <p className="mt-1 text-sm">Post something and see who&apos;s down.</p>
        </div>
      ) : (
        linkups.map((linkup) => <LinkupCard key={linkup.id} linkup={linkup} />)
      )}
    </div>
  );
}
