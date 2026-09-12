import { createClient } from "@/lib/supabase/server";
import { fetchAllUsers, fetchRoles, fetchUserRoles } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { identityHandle, type RoleKey } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { adminToggleAdminAction, adminToggleBanAction, adminAssignRoleAction, adminRevokeRoleAction } from "@/app/actions";
import UserBadges from "@/components/UserBadges";
import Link from "next/link";

const ROLE_STYLES: Record<RoleKey, string> = {
  super_admin: "bg-[#ffd76a]/20 text-[#ffd76a]",
  admin: "bg-accent/20 text-accent-2",
  moderator: "bg-emerald-400/20 text-emerald-300",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const [users, roles, userRoleEntries, canManageAdmins] = await Promise.all([
    fetchAllUsers(supabase),
    fetchRoles(supabase),
    fetchUserRoles(supabase, 500),
    can(supabase, viewer?.id, "manage_admins"),
  ]);

  const rolesByUser = new Map<string, RoleKey[]>();
  for (const entry of userRoleEntries) {
    const list = rolesByUser.get(entry.user_id) ?? [];
    list.push(entry.role.key);
    rolesByUser.set(entry.user_id, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Users</h1>
      <p className="mt-1 text-sm text-text-faint">{users.length} accounts.</p>

      <div className="mt-6 flex flex-col gap-2">
        {users.map((u) => {
          const userRoles = rolesByUser.get(u.id) ?? [];
          return (
            <div
              key={u.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-border-soft bg-surface/40 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">
                  {u.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-text">
                    <span className="truncate">{identityHandle(u)}</span>
                    <UserBadges profile={u} />
                    {u.is_admin && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-2">
                        ADMIN
                      </span>
                    )}
                    {userRoles.map((rk) => (
                      <span key={rk} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLES[rk]}`}>
                        {rk.replace("_", " ").toUpperCase()}
                      </span>
                    ))}
                    {u.is_banned && (
                      <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger">
                        BANNED
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-text-faint">
                    {u.level ?? "—"} {u.faculty ? `· ${u.faculty}` : ""} · joined {timeAgo(u.joined_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/badges?user=${u.id}`}
                  className="rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                >
                  Manage badges
                </Link>

                {canManageAdmins && (
                  <>
                    <form action={adminAssignRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="role_key"
                        defaultValue=""
                        className="rounded-full border border-border-soft bg-surface px-2.5 py-2 text-xs text-text-dim focus:border-accent focus:outline-none"
                      >
                        <option value="" disabled>
                          Assign role…
                        </option>
                        {roles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                      >
                        Grant
                      </button>
                    </form>
                    {userRoles.map((rk) => (
                      <form key={rk} action={adminRevokeRoleAction.bind(null, u.id, rk)}>
                        <button
                          type="submit"
                          className="rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-dim transition hover:border-danger/40 hover:text-danger"
                        >
                          Remove {rk.replace("_", " ")}
                        </button>
                      </form>
                    ))}
                  </>
                )}

                <form action={adminToggleAdminAction.bind(null, u.id, u.is_admin)}>
                  <button
                    type="submit"
                    className="rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                  >
                    {u.is_admin ? "Revoke legacy admin" : "Make legacy admin"}
                  </button>
                </form>
                <form action={adminToggleBanAction.bind(null, u.id, u.is_banned)}>
                  <button
                    type="submit"
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      u.is_banned
                        ? "border-border-soft text-text-dim hover:text-text"
                        : "border-danger/40 text-danger hover:bg-danger/10"
                    }`}
                  >
                    {u.is_banned ? "Unban" : "Ban"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {users.length === 0 && <p className="text-sm text-text-faint">No users yet.</p>}
      </div>
    </div>
  );
}
