import { createClient } from "@/lib/supabase/server";
import { fetchAllFaceOffs } from "@/lib/queries";
import { compactNumber } from "@/lib/format";
import { adminCreateFaceOffAction, adminSetFaceOffStatusAction } from "@/app/actions";

export default async function AdminFaceOffsPage() {
  const supabase = await createClient();
  const faceoffs = await fetchAllFaceOffs(supabase);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Face-Offs</h1>
      <p className="mt-1 text-sm text-text-faint">Create and manage debate questions.</p>

      <form
        action={adminCreateFaceOffAction}
        className="mt-6 flex flex-col gap-2 rounded-2xl border border-border-soft bg-surface/40 p-4"
      >
        <input
          name="question"
          required
          placeholder="Question, e.g. Should Bowen extend hostel curfew to 11PM?"
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            name="yes_label"
            required
            defaultValue="YES"
            placeholder="YES label"
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <input
            name="no_label"
            required
            defaultValue="NO"
            placeholder="NO label"
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-faint">
          <input type="checkbox" name="go_live" defaultChecked className="accent-accent" /> Make it live
          immediately
        </label>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          Create Face-Off
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {faceoffs.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border-soft bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-text">{f.question}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  f.status === "live"
                    ? "bg-accent/20 text-accent-2"
                    : f.status === "ended"
                      ? "bg-surface-2 text-text-faint"
                      : "bg-yes/15 text-yes"
                }`}
              >
                {f.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-faint tabular">
              {compactNumber(f.yes_count + f.no_count)} votes · {f.yes_label} {f.yes_count} / {f.no_label}{" "}
              {f.no_count}
            </p>
            <div className="mt-3 flex gap-2">
              {f.status !== "live" && (
                <form action={adminSetFaceOffStatusAction.bind(null, f.id, "live")}>
                  <button
                    type="submit"
                    className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                  >
                    Go live
                  </button>
                </form>
              )}
              {f.status !== "ended" && (
                <form action={adminSetFaceOffStatusAction.bind(null, f.id, "ended")}>
                  <button
                    type="submit"
                    className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                  >
                    End it
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {faceoffs.length === 0 && <p className="text-sm text-text-faint">No Face-Offs yet.</p>}
      </div>
    </div>
  );
}
