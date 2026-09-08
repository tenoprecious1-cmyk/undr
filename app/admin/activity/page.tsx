import { createClient } from "@/lib/supabase/server";
import { fetchAdminActivityLog } from "@/lib/queries";
import { identityHandle } from "@/lib/types";
import { timeAgo } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  updated_platform_settings: "Updated platform settings",
  opened_undr: "Opened UNDR",
  assigned_role: "Assigned role",
  revoked_role: "Revoked role",
  featured_post: "Featured a post",
  unfeatured_post: "Unfeatured a post",
  gold_awarded: "Awarded UNDR Gold",
  gold_revoked: "Revoked UNDR Gold",
  verification_changed: "Changed verification status",
  badge_awarded: "Awarded a badge",
  badge_revoked: "Revoked a badge",
};

export default async function AdminActivityPage() {
  const supabase = await createClient();
  const log = await fetchAdminActivityLog(supabase, 100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Admin Activity</h1>
      <p className="mt-1 text-sm text-text-faint">Every sensitive admin action, logged for accountability.</p>

      <div className="mt-6 flex flex-col gap-2">
        {log.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-border-soft bg-surface/40 p-4">
            <p className="text-sm font-semibold text-text">
              {ACTION_LABELS[entry.action] ?? entry.action}
              {entry.target_label && <span className="font-normal text-text-dim"> — {entry.target_label}</span>}
            </p>
            <p className="mt-1 text-xs text-text-faint">
              {entry.admin ? identityHandle(entry.admin) : "Unknown admin"} · {timeAgo(entry.created_at)}
              {entry.target_type && ` · target: ${entry.target_type}`}
            </p>
            {entry.reason && <p className="mt-1.5 text-xs text-text-dim">Reason: {entry.reason}</p>}
          </div>
        ))}
        {log.length === 0 && <p className="text-sm text-text-faint">No admin activity yet.</p>}
      </div>
    </div>
  );
}
