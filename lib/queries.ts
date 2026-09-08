import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminActivityLogEntry,
  AdminPost,
  AdminRoomMessage,
  AdminStats,
  BadgeAuditEntry,
  BadgeCatalogEntry,
  BadgeStats,
  FaceOff,
  Linkup,
  Notification,
  PlatformSettings,
  Post,
  PostCategory,
  PostPromotion,
  Profile,
  Role,
  Room,
  RoomMessage,
  UserBadge,
  UserRoleEntry,
} from "./types";

const POST_SELECT = `
  id, author_id, content, category, parent_id, is_poll,
  reply_count, repost_count, reaction_count, bookmark_count, created_at,
  author:profiles!posts_author_id_fkey(*),
  post_hashtags(hashtags(tag)),
  poll_options(*),
  post_media(*)
`;

function publicMediaUrl(storagePath: string): string {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rrsnvssbimcfotyuaare.supabase.co";
  return `${base}/storage/v1/object/public/post-media/${storagePath}`;
}

type RawPostMedia = {
  id: string;
  post_id: string;
  media_type: "image" | "video";
  storage_path: string;
  position: number;
  width: number | null;
  height: number | null;
};

type RawPost = {
  id: string;
  author_id: string;
  content: string;
  category: PostCategory;
  parent_id: string | null;
  is_poll: boolean;
  reply_count: number;
  repost_count: number;
  reaction_count: number;
  bookmark_count: number;
  created_at: string;
  author: Profile;
  post_hashtags: { hashtags: { tag: string } | null }[] | null;
  poll_options: Post["poll_options"];
  post_media: RawPostMedia[] | null;
};

function mapRawPost(row: RawPost): Post {
  return {
    id: row.id,
    author_id: row.author_id,
    content: row.content,
    category: row.category,
    parent_id: row.parent_id,
    is_poll: row.is_poll,
    reply_count: row.reply_count,
    repost_count: row.repost_count,
    reaction_count: row.reaction_count,
    bookmark_count: row.bookmark_count,
    created_at: row.created_at,
    author: row.author,
    hashtags: (row.post_hashtags ?? [])
      .map((ph) => ph.hashtags?.tag)
      .filter((t): t is string => !!t),
    poll_options: (row.poll_options ?? []).slice().sort((a, b) => a.position - b.position),
    media: (row.post_media ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        post_id: m.post_id,
        media_type: m.media_type,
        storage_path: m.storage_path,
        position: m.position,
        width: m.width,
        height: m.height,
        url: publicMediaUrl(m.storage_path),
      })),
    viewer_reacted: false,
    viewer_bookmarked: false,
    viewer_reposted: false,
    viewer_voted_option_id: null,
  };
}

export async function attachViewerState(
  supabase: SupabaseClient,
  userId: string | null,
  posts: Post[]
): Promise<Post[]> {
  if (!userId || posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);

  const [{ data: reactions }, { data: bookmarks }, { data: reposts }, { data: votes }] =
    await Promise.all([
      supabase.from("reactions").select("post_id").eq("user_id", userId).in("post_id", ids),
      supabase.from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", ids),
      supabase.from("reposts").select("post_id").eq("user_id", userId).in("post_id", ids),
      supabase.from("poll_votes").select("post_id, option_id").eq("user_id", userId).in("post_id", ids),
    ]);

  const reactedSet = new Set((reactions ?? []).map((r) => r.post_id));
  const bookmarkedSet = new Set((bookmarks ?? []).map((r) => r.post_id));
  const repostedSet = new Set((reposts ?? []).map((r) => r.post_id));
  const voteMap = new Map((votes ?? []).map((v) => [v.post_id, v.option_id]));

  return posts.map((p) => ({
    ...p,
    viewer_reacted: reactedSet.has(p.id),
    viewer_bookmarked: bookmarkedSet.has(p.id),
    viewer_reposted: repostedSet.has(p.id),
    viewer_voted_option_id: voteMap.get(p.id) ?? null,
  }));
}

export async function fetchFeed(
  supabase: SupabaseClient,
  opts: { category?: PostCategory; hashtag?: string; authorId?: string; limit?: number; onlyTop?: boolean } = {}
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 40);

  if (opts.category) query = query.eq("category", opts.category);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);

  if (opts.hashtag) {
    const { data: tagRow } = await supabase
      .from("hashtags")
      .select("id")
      .eq("tag", opts.hashtag.toLowerCase())
      .maybeSingle();
    if (!tagRow) return [];
    const { data: links } = await supabase
      .from("post_hashtags")
      .select("post_id")
      .eq("hashtag_id", tagRow.id);
    const ids = (links ?? []).map((l) => l.post_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  const posts = ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
  return attachPromotions(supabase, posts) as unknown as Promise<Post[]>;
}

export async function fetchTrendingFeed(supabase: SupabaseClient, limit = 40): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_id", null)
    .order("reaction_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const posts = ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
  return attachPromotions(supabase, posts) as unknown as Promise<Post[]>;
}

export async function fetchReplies(supabase: SupabaseClient, postId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("parent_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
}

export async function fetchPost(supabase: SupabaseClient, postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRawPost(data as unknown as RawPost);
}

export async function fetchBookmarkedPosts(supabase: SupabaseClient, userId: string): Promise<Post[]> {
  const { data: bms } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const ids = (bms ?? []).map((b) => b.post_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
  if (error) throw error;
  const posts = ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
  const order = new Map(ids.map((id, i) => [id, i]));
  return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function fetchPolls(supabase: SupabaseClient, limit = 40): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_poll", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
}

export async function fetchRepliesByAuthor(supabase: SupabaseClient, authorId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .not("parent_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
}

export async function fetchLikedPosts(supabase: SupabaseClient, userId: string): Promise<Post[]> {
  const { data: rx } = await supabase
    .from("reactions")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const ids = (rx ?? []).map((r) => r.post_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
  if (error) throw error;
  const posts = ((data ?? []) as unknown as RawPost[]).map(mapRawPost);
  const order = new Map(ids.map((id, i) => [id, i]));
  return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function fetchTrendingHashtags(supabase: SupabaseClient, limit = 8) {
  const { data, error } = await supabase
    .from("hashtags")
    .select("id, tag, post_count, last_used_at")
    .order("post_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfileStats(supabase: SupabaseClient, userId: string) {
  const [{ count: posts }, { count: replies }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).is("parent_id", null),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).not("parent_id", "is", null),
  ]);

  const { data: authored } = await supabase.from("posts").select("id").eq("author_id", userId);
  const ids = (authored ?? []).map((p) => p.id);
  let reactions = 0;
  if (ids.length > 0) {
    const { count } = await supabase
      .from("reactions")
      .select("post_id", { count: "exact", head: true })
      .in("post_id", ids);
    reactions = count ?? 0;
  }

  return { posts: posts ?? 0, replies: replies ?? 0, reactions };
}

// ============ FACE-OFF ============

export async function fetchLiveFaceOff(
  supabase: SupabaseClient,
  userId: string | null
): Promise<FaceOff | null> {
  const { data, error } = await supabase
    .from("faceoffs")
    .select("*")
    .eq("status", "live")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let viewerSide: "yes" | "no" | null = null;
  if (userId) {
    const { data: vote } = await supabase
      .from("faceoff_votes")
      .select("side")
      .eq("faceoff_id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    viewerSide = (vote?.side as "yes" | "no" | undefined) ?? null;
  }

  return { ...(data as FaceOff), viewer_side: viewerSide };
}

// ============ ROOMS ============

export async function fetchRooms(supabase: SupabaseClient): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoom(supabase: SupabaseClient, roomId: string): Promise<Room | null> {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRoomMessages(supabase: SupabaseClient, roomId: string): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from("room_messages")
    .select("id, room_id, author_id, content, created_at, author:profiles!room_messages_author_id_fkey(*)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RoomMessage[];
}

// ============ LINK UP ============

export async function fetchLinkups(supabase: SupabaseClient, userId: string | null): Promise<Linkup[]> {
  const { data, error } = await supabase
    .from("linkups")
    .select("*, author:profiles!linkups_author_id_fkey(*)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  const linkups = (data ?? []) as unknown as (Linkup & { author: Profile })[];

  if (!userId || linkups.length === 0) {
    return linkups.map((l) => ({ ...l, viewer_down: false }));
  }

  const { data: downs } = await supabase
    .from("linkup_responses")
    .select("linkup_id")
    .eq("user_id", userId)
    .in("linkup_id", linkups.map((l) => l.id));
  const downSet = new Set((downs ?? []).map((d) => d.linkup_id));

  return linkups.map((l) => ({ ...l, viewer_down: downSet.has(l.id) }));
}

// ============ NOTIFICATIONS ============

export async function fetchNotifications(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as Notification[];
}

export async function fetchUnreadNotificationCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

// ============ ADMIN ============

export async function fetchAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const now = new Date().toISOString();

  const [
    { count: totalUsers },
    { count: postsToday },
    { count: totalPosts },
    { count: activeRooms },
    { count: activeLinkups },
    { count: totalFaceoffs },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("rooms").select("id", { count: "exact", head: true }).gt("expires_at", now),
    supabase.from("linkups").select("id", { count: "exact", head: true }).gt("expires_at", now),
    supabase.from("faceoffs").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    postsToday: postsToday ?? 0,
    totalPosts: totalPosts ?? 0,
    activeRooms: activeRooms ?? 0,
    activeLinkups: activeLinkups ?? 0,
    totalFaceoffs: totalFaceoffs ?? 0,
  };
}

export async function fetchAllUsers(supabase: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecentPostsForModeration(supabase: SupabaseClient, limit = 30): Promise<AdminPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, category, created_at, author:profiles!posts_author_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AdminPost[];
}

export async function fetchRecentRoomMessagesForModeration(
  supabase: SupabaseClient,
  limit = 30
): Promise<AdminRoomMessage[]> {
  const { data, error } = await supabase
    .from("room_messages")
    .select(
      "id, room_id, content, created_at, author:profiles!room_messages_author_id_fkey(*), room:rooms(name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AdminRoomMessage[];
}

export async function fetchAllFaceOffs(supabase: SupabaseClient): Promise<FaceOff[]> {
  const { data, error } = await supabase
    .from("faceoffs")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FaceOff[];
}

// ============ BADGES ============

export async function fetchBadgeCatalog(supabase: SupabaseClient): Promise<BadgeCatalogEntry[]> {
  const { data, error } = await supabase
    .from("badge_catalog")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BadgeCatalogEntry[];
}

export async function fetchUserBadges(supabase: SupabaseClient, userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("*, badge:badge_catalog!user_badges_badge_key_fkey(*)")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("awarded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UserBadge[];
}

export async function fetchBadgeStats(supabase: SupabaseClient): Promise<BadgeStats> {
  const [{ count: verifiedCount }, { count: goldCount }, { count: achievementCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("gold_status", true),
    supabase.from("user_badges").select("id", { count: "exact", head: true }).is("revoked_at", null),
  ]);
  return {
    verifiedCount: verifiedCount ?? 0,
    goldCount: goldCount ?? 0,
    achievementCount: achievementCount ?? 0,
  };
}

export async function fetchBadgeAuditLog(supabase: SupabaseClient, limit = 50): Promise<BadgeAuditEntry[]> {
  const { data, error } = await supabase
    .from("badge_audit_log")
    .select(
      "*, target:profiles!badge_audit_log_target_user_id_fkey(*), admin:profiles!badge_audit_log_admin_id_fkey(*)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as BadgeAuditEntry[];
}

export async function fetchUserBadgeAuditLog(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<BadgeAuditEntry[]> {
  const { data, error } = await supabase
    .from("badge_audit_log")
    .select(
      "*, target:profiles!badge_audit_log_target_user_id_fkey(*), admin:profiles!badge_audit_log_admin_id_fkey(*)"
    )
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as BadgeAuditEntry[];
}

export async function searchProfiles(supabase: SupabaseClient, query: string, limit = 20): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const tagNumber = Number(trimmed.replace(/^#/, ""));
  let builder = supabase.from("profiles").select("*").limit(limit);
  if (!Number.isNaN(tagNumber) && trimmed.replace(/^#/, "").length > 0 && /^#?\d+$/.test(trimmed)) {
    builder = builder.eq("tag_number", tagNumber);
  } else {
    builder = builder.or(`animal.ilike.%${trimmed}%,level.ilike.%${trimmed}%,faculty.ilike.%${trimmed}%`);
  }
  const { data, error } = await builder;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ============ PLATFORM CONTROL ============

export async function fetchPlatformSettings(supabase: SupabaseClient): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.from("platform_settings").select("*").eq("id", true).single();
  if (error) return null;
  return data as PlatformSettings;
}

export async function updatePlatformSettings(
  supabase: SupabaseClient,
  patch: Partial<
    Pick<
      PlatformSettings,
      | "mode"
      | "launch_counter"
      | "prelaunch_message_enabled"
      | "prelaunch_counter_enabled"
      | "platform_phase"
      | "identity_mode"
      | "followers_enabled"
      | "following_enabled"
      | "profile_pictures_enabled"
      | "opened_at"
      | "updated_by"
    >
  >
) {
  return supabase
    .from("platform_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true);
}

// ============ RBAC ============

export async function fetchRoles(supabase: SupabaseClient): Promise<Role[]> {
  const { data, error } = await supabase.from("roles").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Role[];
}

export async function fetchUserRoles(supabase: SupabaseClient, limit = 100): Promise<UserRoleEntry[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*, role:roles(*), user:profiles!user_roles_user_id_fkey(*)")
    .order("granted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as UserRoleEntry[];
}

export async function fetchRolesForUser(supabase: SupabaseClient, userId: string): Promise<Role[]> {
  const { data, error } = await supabase.from("user_roles").select("role:roles(*)").eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as unknown as { role: Role }[]).map((r) => r.role);
}

// ============ ADMIN ACTIVITY LOG ============

export async function fetchAdminActivityLog(
  supabase: SupabaseClient,
  limit = 50
): Promise<AdminActivityLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_activity_logs")
    .select("*, admin:profiles!admin_activity_logs_admin_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AdminActivityLogEntry[];
}

// ============ FEATURED CONTENT ============

export async function fetchActivePromotions(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<Record<string, PostPromotion>> {
  if (postIds.length === 0) return {};
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("post_promotions")
    .select("*")
    .in("post_id", postIds)
    .eq("active", true)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`);
  if (error || !data) return {};
  const map: Record<string, PostPromotion> = {};
  for (const promo of data as PostPromotion[]) {
    // last write wins if multiple; posts usually carry one active promo
    map[promo.post_id] = promo;
  }
  return map;
}

export async function attachPromotions<T extends { id: string }>(
  supabase: SupabaseClient,
  posts: T[]
): Promise<(T & { promotion: PostPromotion | null })[]> {
  const promoMap = await fetchActivePromotions(
    supabase,
    posts.map((p) => p.id)
  );
  return posts.map((p) => ({ ...p, promotion: promoMap[p.id] ?? null }));
}
