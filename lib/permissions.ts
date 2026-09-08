import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionKey, RoleKey } from "@/lib/types";

/**
 * Thin wrappers around the has_permission / has_role / is_any_admin
 * Postgres functions (security definer, RLS-safe). Prefer these over
 * hand-rolled `is_admin` checks anywhere a specific permission is being
 * gated — `is_admin = true` still works as an implicit super_admin for
 * backward compatibility, but new admin surfaces should ask for a
 * specific permission key.
 */

export async function can(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string | null | undefined,
  permission: PermissionKey
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("has_permission", { uid: userId, perm_key: permission });
  if (error) return false;
  return Boolean(data);
}

export async function hasRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string | null | undefined,
  role: RoleKey
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("has_role", { uid: userId, role_key: role });
  if (error) return false;
  return Boolean(data);
}

export async function isAnyAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_any_admin", { uid: userId });
  if (error) return false;
  return Boolean(data);
}
