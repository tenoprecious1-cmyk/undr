"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { can, isAnyAdmin } from "@/lib/permissions";
import { fetchPlatformSettings, fetchReplies, isFeatureEnabled } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { createOrUpdateSubaccount, resolveAccountName, verifyTransaction } from "@/lib/flutterwave";
import type { PlatformMode, PlatformPhase, IdentityMode, PromoType, RoleKey, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionState = { error?: string } | null;

// Pre-launch lockout: non-admins can't mutate anything (post, react, vote, etc.)
// while the platform is closed, even by calling a server action directly —
// this backs up the UI-level gate in app/(app)/layout.tsx.
async function assertLaunched(supabase: SupabaseClient, userId: string) {
  const [settings, isAdmin] = await Promise.all([
    fetchPlatformSettings(supabase),
    isAnyAdmin(supabase, userId),
  ]);
  if (settings?.mode === "pre_launch" && !isAdmin) {
    redirect("/home");
  }
}

// Marketplace is a preview feature — off by default. While off, only
// admins (previewing it) may use the routes/actions; everyone else gets
// bounced, same pattern as the pre-launch lock above.
async function assertMarketplaceEnabled(supabase: SupabaseClient, userId: string) {
  const [enabled, isAdmin] = await Promise.all([
    isFeatureEnabled(supabase, "marketplace"),
    isAnyAdmin(supabase, userId),
  ]);
  if (!enabled && !isAdmin) redirect("/home");
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const level = String(formData.get("level") ?? "");
  const faculty = String(formData.get("faculty") ?? "");
  const department = String(formData.get("department") ?? "");

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { level, faculty, department } },
  });

  if (error) return { error: error.message };

  if (!data.session) {
    // email confirmation required
    redirect("/login?confirm=1");
  }

  redirect("/home");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/home");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "video/quicktime") return "mov";
  return mime.split("/")[1] ?? "bin";
}

export async function createPostAction(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  const category = (String(formData.get("category") ?? "gist") === "chaos" ? "chaos" : "gist") as
    | "gist"
    | "chaos";
  const parentId = formData.get("parent_id") ? String(formData.get("parent_id")) : null;
  const pollOptionsRaw = formData.get("poll_options");
  const redirectTo = formData.get("redirect_to") ? String(formData.get("redirect_to")) : null;

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0 && IMAGE_TYPES.has(f.type))
    .slice(0, MAX_IMAGES)
    .filter((f) => f.size <= MAX_IMAGE_BYTES);

  const videoFile = formData.get("video");
  const video =
    videoFile instanceof File &&
    videoFile.size > 0 &&
    VIDEO_TYPES.has(videoFile.type) &&
    videoFile.size <= MAX_VIDEO_BYTES
      ? videoFile
      : null;

  const hasMedia = images.length > 0 || !!video;
  if (!content && !hasMedia) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  // A post is either a poll or has media, not both — keeps composer state simple.
  const pollOptions = hasMedia
    ? []
    : pollOptionsRaw
      ? String(pollOptionsRaw)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      content,
      category,
      parent_id: parentId,
      is_poll: pollOptions.length >= 2,
    })
    .select("id")
    .single();

  if (error || !post) return;

  if (pollOptions.length >= 2) {
    await supabase.from("poll_options").insert(
      pollOptions.map((label, i) => ({ post_id: post.id, label, position: i }))
    );
  }

  if (hasMedia) {
    const mediaFiles: { file: File; media_type: "image" | "video" }[] = video
      ? [{ file: video, media_type: "video" }]
      : images.map((file) => ({ file, media_type: "image" as const }));

    const uploaded: { storage_path: string; media_type: "image" | "video"; position: number }[] = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const { file, media_type } = mediaFiles[i];
      const path = `${user.id}/${post.id}/${i}-${Date.now()}.${extFromMime(file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!uploadError) uploaded.push({ storage_path: path, media_type, position: i });
    }

    if (uploaded.length > 0) {
      await supabase.from("post_media").insert(
        uploaded.map((m) => ({ post_id: post.id, ...m }))
      );
    }
  }

  revalidatePath("/home");
  revalidatePath("/explore");
  revalidatePath("/chaos");
  if (parentId) revalidatePath(`/post/${parentId}`);
  if (redirectTo) redirect(redirectTo);
}

export async function toggleReactionAction(postId: string, active: boolean, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  if (active) {
    await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("reactions").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath(path);
}

export async function toggleBookmarkAction(postId: string, active: boolean, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  if (active) {
    await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("bookmarks").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath(path);
  revalidatePath("/bookmarks");
}

export async function toggleRepostAction(postId: string, active: boolean, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  if (active) {
    await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("reposts").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath(path);
}

export async function deletePostAction(postId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  // RLS ("users can delete their own posts") is the real authority here —
  // this only ever deletes a row when author_id = auth.uid(), so this is
  // safe even if someone calls it with a postId that isn't theirs.
  await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);

  revalidatePath(path);
  revalidatePath("/home");
  revalidatePath("/explore");
  revalidatePath("/chaos");
  revalidatePath("/bookmarks");
  revalidatePath("/profile");
}

export async function votePollAction(postId: string, optionId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  await supabase.from("poll_votes").insert({ post_id: postId, option_id: optionId, user_id: user.id });
  revalidatePath(path);
}

export async function voteFaceOffAction(faceoffId: string, side: "yes" | "no") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  await supabase.from("faceoff_votes").insert({ faceoff_id: faceoffId, user_id: user.id, side });
  revalidatePath("/faceoff");
}

export async function postRoomMessageAction(formData: FormData) {
  const roomId = String(formData.get("room_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!roomId || !content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  await supabase.from("room_messages").insert({ room_id: roomId, author_id: user.id, content });
  revalidatePath(`/rooms/${roomId}`);
}

export async function createLinkupAction(formData: FormData) {
  const activity = String(formData.get("activity") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const vibeEmoji = String(formData.get("vibe_emoji") ?? "🎮");
  const hours = Math.max(1, Math.min(8, Number(formData.get("hours") ?? 2)));
  if (!activity) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  await supabase.from("linkups").insert({
    author_id: user.id,
    activity,
    location: location || null,
    vibe_emoji: vibeEmoji || "🎮",
    expires_at: expiresAt,
  });
  revalidatePath("/linkup");
}

export async function toggleLinkupDownAction(linkupId: string, active: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);

  if (active) {
    await supabase.from("linkup_responses").delete().eq("linkup_id", linkupId).eq("user_id", user.id);
  } else {
    await supabase.from("linkup_responses").insert({ linkup_id: linkupId, user_id: user.id });
  }
  revalidatePath("/linkup");
}

export async function markNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/notifications");
}

// ============ CLEAN SHOT ============

export type CleanShotReplyOption = {
  id: string;
  content: string;
  created_at: string;
  author: Profile;
};

// Lightweight reply list for the Clean Shot reply picker — reuses the same
// fetchReplies pipeline as the thread view, trimmed to what the card needs.
export async function fetchRepliesForCleanShotAction(postId: string): Promise<CleanShotReplyOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const replies = await fetchReplies(supabase, postId);
  return replies.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    author: r.author,
  }));
}

// ============ ADMIN ============
// RLS enforces admin-only writes on every table below (see is_admin() policies),
// so a non-admin calling these just no-ops. The /admin routes are also gated
// in app/admin/layout.tsx so non-admins never see the buttons.

export async function adminDeletePostAction(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("posts").delete().eq("id", postId);
  revalidatePath("/admin/moderation");
  revalidatePath("/home");
}

export async function adminDeleteRoomMessageAction(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("room_messages").delete().eq("id", messageId);
  revalidatePath("/admin/moderation");
}

export async function adminToggleBanAction(userId: string, currentlyBanned: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ is_banned: !currentlyBanned }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function adminToggleAdminAction(userId: string, currentlyAdmin: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ is_admin: !currentlyAdmin }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function adminCreateFaceOffAction(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  const yesLabel = String(formData.get("yes_label") ?? "YES").trim() || "YES";
  const noLabel = String(formData.get("no_label") ?? "NO").trim() || "NO";
  const goLive = formData.get("go_live") === "on";
  if (!question) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("faceoffs").insert({
    question,
    yes_label: yesLabel,
    no_label: noLabel,
    status: goLive ? "live" : "scheduled",
    starts_at: new Date().toISOString(),
  });

  revalidatePath("/admin/faceoffs");
  revalidatePath("/faceoff");
  revalidatePath("/home");
}

export async function adminSetFaceOffStatusAction(faceoffId: string, status: "scheduled" | "live" | "ended") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("faceoffs")
    .update({ status, ends_at: status === "ended" ? new Date().toISOString() : null })
    .eq("id", faceoffId);

  revalidatePath("/admin/faceoffs");
  revalidatePath("/faceoff");
  revalidatePath("/home");
}

export async function adminCreateRoomAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "💬").trim() || "💬";
  const topic = String(formData.get("topic") ?? "").trim();
  const hours = Math.max(1, Math.min(24 * 14, Number(formData.get("hours") ?? 24)));
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  await supabase.from("rooms").insert({
    name,
    emoji,
    topic: topic || null,
    creator_id: user.id,
    expires_at: expiresAt,
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
}

export async function adminDeleteRoomAction(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("rooms").delete().eq("id", roomId);
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
}

export async function adminDeleteLinkupAction(linkupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("linkups").delete().eq("id", linkupId);
  revalidatePath("/admin/moderation");
  revalidatePath("/linkup");
}

// ============ BADGES (admin) ============
// RLS enforces admin-only writes on badge_catalog / user_badges / badge_audit_log
// and on the new profiles columns, so a non-admin calling these just no-ops.

function revalidateBadgeSurfaces() {
  revalidatePath("/admin/badges");
  revalidatePath("/admin/users");
  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/explore");
}

export async function adminAwardGoldAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const displayPublicly = formData.get("display_publicly") === "on";
  if (!userId || !reason) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({
      gold_status: true,
      gold_awarded_at: new Date().toISOString(),
      gold_reason: reason,
      gold_reason_public: displayPublicly,
    })
    .eq("id", userId);

  await supabase.from("badge_audit_log").insert({
    target_user_id: userId,
    admin_id: user.id,
    action: "gold_awarded",
    reason,
    reason_public: displayPublicly,
    previous_value: "false",
    new_value: "true",
  });

  revalidateBadgeSurfaces();
}

export async function adminRevokeGoldAction(userId: string) {
  if (!userId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ gold_status: false, gold_reason: null, gold_reason_public: false })
    .eq("id", userId);

  await supabase.from("badge_audit_log").insert({
    target_user_id: userId,
    admin_id: user.id,
    action: "gold_revoked",
    previous_value: "true",
    new_value: "false",
  });

  revalidateBadgeSurfaces();
}

export async function adminSetVerificationAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const validStatuses = ["not_verified", "pending", "verified", "revoked"];
  if (!userId || !validStatuses.includes(status)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: before } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", userId)
    .single();

  await supabase.from("profiles").update({ verification_status: status }).eq("id", userId);

  await supabase.from("badge_audit_log").insert({
    target_user_id: userId,
    admin_id: user.id,
    action: "verification_changed",
    previous_value: before?.verification_status ?? null,
    new_value: status,
  });

  revalidateBadgeSurfaces();
}

export async function adminAwardBadgeAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const badgeKey = String(formData.get("badge_key") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !badgeKey) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("user_badges").upsert(
    {
      user_id: userId,
      badge_key: badgeKey,
      awarded_at: new Date().toISOString(),
      awarded_by: user.id,
      reason: reason || null,
      revoked_at: null,
      revoked_by: null,
    },
    { onConflict: "user_id,badge_key" }
  );

  await supabase.from("badge_audit_log").insert({
    target_user_id: userId,
    admin_id: user.id,
    action: "badge_awarded",
    badge_key: badgeKey,
    reason: reason || null,
  });

  revalidateBadgeSurfaces();
}

export async function adminRevokeBadgeAction(userId: string, badgeKey: string) {
  if (!userId || !badgeKey) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("user_badges")
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("user_id", userId)
    .eq("badge_key", badgeKey);

  await supabase.from("badge_audit_log").insert({
    target_user_id: userId,
    admin_id: user.id,
    action: "badge_revoked",
    badge_key: badgeKey,
  });

  revalidateBadgeSurfaces();
}

// ============ PLATFORM CONTROL (UNDR CONTROL) ============
// RLS enforces manage_platform_settings on writes; these are also gated
// client-side by only rendering the controls to users with that permission.

async function logAdminActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  adminId: string,
  action: string,
  opts: {
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    reason?: string;
    previousState?: unknown;
    newState?: unknown;
  } = {}
) {
  await supabase.from("admin_activity_logs").insert({
    admin_id: adminId,
    action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    target_label: opts.targetLabel ?? null,
    reason: opts.reason ?? null,
    previous_state: opts.previousState ?? null,
    new_state: opts.newState ?? null,
  });
}

export async function adminSaveControlSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_platform_settings"))) return;

  const { data: before } = await supabase.from("platform_settings").select("*").eq("id", true).single();

  const launchCounter = Math.max(0, Number(formData.get("launch_counter") ?? before?.launch_counter ?? 902));
  const prelaunchMessageEnabled = formData.get("prelaunch_message_enabled") === "on";
  const prelaunchCounterEnabled = formData.get("prelaunch_counter_enabled") === "on";
  const platformPhase = String(formData.get("platform_phase") ?? before?.platform_phase ?? "underground") as PlatformPhase;
  const identityMode = String(formData.get("identity_mode") ?? before?.identity_mode ?? "anonymous") as IdentityMode;
  const followersEnabled = formData.get("followers_enabled") === "on";
  const followingEnabled = formData.get("following_enabled") === "on";
  const profilePicturesEnabled = formData.get("profile_pictures_enabled") === "on";

  await supabase
    .from("platform_settings")
    .update({
      launch_counter: launchCounter,
      prelaunch_message_enabled: prelaunchMessageEnabled,
      prelaunch_counter_enabled: prelaunchCounterEnabled,
      platform_phase: platformPhase,
      identity_mode: identityMode,
      followers_enabled: followersEnabled,
      following_enabled: followingEnabled,
      profile_pictures_enabled: profilePicturesEnabled,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", true);

  await logAdminActivity(supabase, user.id, "updated_platform_settings", {
    targetType: "platform_settings",
    previousState: before,
  });

  revalidatePath("/admin/control");
  revalidatePath("/signup");
  revalidatePath("/home");
}

export async function adminOpenUndrAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_platform_settings"))) return;

  const { data: before } = await supabase.from("platform_settings").select("mode").eq("id", true).single();

  await supabase
    .from("platform_settings")
    .update({ mode: "open" as PlatformMode, opened_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", true);

  await logAdminActivity(supabase, user.id, "opened_undr", {
    targetType: "platform_settings",
    previousState: before,
    newState: { mode: "open" },
  });

  revalidatePath("/admin/control");
  revalidatePath("/signup");
  revalidatePath("/home");
}

export async function adminLockUndrAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_platform_settings"))) return;

  const { data: before } = await supabase.from("platform_settings").select("mode").eq("id", true).single();

  await supabase
    .from("platform_settings")
    .update({ mode: "pre_launch" as PlatformMode, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", true);

  await logAdminActivity(supabase, user.id, "locked_undr", {
    targetType: "platform_settings",
    previousState: before,
    newState: { mode: "pre_launch" },
  });

  revalidatePath("/admin/control");
  revalidatePath("/signup");
  revalidatePath("/home");
}

// ============ FEATURE CONTROL ============

export async function adminSetFeatureFlagAction(key: string, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_platform_settings"))) return;

  const { data: before } = await supabase.from("feature_flags").select("*").eq("key", key).maybeSingle();

  await supabase
    .from("feature_flags")
    .update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("key", key);

  await logAdminActivity(supabase, user.id, enabled ? "enabled_feature" : "disabled_feature", {
    targetType: "feature_flag",
    targetId: key,
    previousState: before,
    newState: { enabled },
  });

  revalidatePath("/admin/control/features");
  revalidatePath("/home");
  revalidatePath("/explore");
  revalidatePath("/chaos");
  revalidatePath("/faceoff");
  revalidatePath("/rooms");
  revalidatePath("/compose");
}

// ============ ADMIN ROLES ============

export async function adminAssignRoleAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_admins"))) return;

  const userId = String(formData.get("user_id") ?? "");
  const roleKey = String(formData.get("role_key") ?? "") as RoleKey;
  if (!userId || !roleKey) return;

  const { data: role } = await supabase.from("roles").select("id").eq("key", roleKey).single();
  if (!role) return;

  await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role_id: role.id, granted_by: user.id }, { onConflict: "user_id,role_id" });

  await logAdminActivity(supabase, user.id, "assigned_role", {
    targetType: "user",
    targetId: userId,
    newState: { role: roleKey },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/control");
}

export async function adminRevokeRoleAction(userId: string, roleKey: RoleKey) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_admins"))) return;

  const { data: role } = await supabase.from("roles").select("id").eq("key", roleKey).single();
  if (!role) return;

  await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", role.id);

  await logAdminActivity(supabase, user.id, "revoked_role", {
    targetType: "user",
    targetId: userId,
    previousState: { role: roleKey },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/control");
}

// ============ FEATURED CONTENT ============

export async function adminPromotePostAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_content"))) return;

  const postId = String(formData.get("post_id") ?? "");
  const promoType = String(formData.get("promo_type") ?? "") as PromoType;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!postId || !promoType) return;

  // one active promo per post — clear any existing before inserting the new one
  await supabase.from("post_promotions").update({ active: false }).eq("post_id", postId).eq("active", true);

  await supabase.from("post_promotions").insert({
    post_id: postId,
    promo_type: promoType,
    reason: reason || null,
    created_by: user.id,
  });

  await logAdminActivity(supabase, user.id, "featured_post", {
    targetType: "post",
    targetId: postId,
    newState: { promo_type: promoType, reason: reason || null },
  });

  revalidatePath("/home");
  revalidatePath("/explore");
  revalidatePath("/trending");
  revalidatePath(`/post/${postId}`);
}

export async function adminUnpromotePostAction(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await can(supabase, user.id, "manage_content"))) return;

  await supabase.from("post_promotions").update({ active: false }).eq("post_id", postId).eq("active", true);

  await logAdminActivity(supabase, user.id, "unfeatured_post", { targetType: "post", targetId: postId });

  revalidatePath("/home");
  revalidatePath("/explore");
  revalidatePath("/trending");
  revalidatePath(`/post/${postId}`);
}

// ============ ONBOARDING TOUR ============

export async function setOnboardingTourStatusAction(
  status: "in_progress" | "completed" | "skipped"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ onboarding_tour_status: status }).eq("id", user.id);
  revalidatePath("/home");
  revalidatePath("/settings");
}

export async function replayOnboardingTourAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarding_tour_status: "not_started" }).eq("id", user.id);
  redirect("/home");
}

// ============ MARKETPLACE ============
// Preview feature behind feature_flags.marketplace. Until it's flipped on
// from /admin/control/features, only admins can reach these — that's the
// "preview before it goes live for everyone" workflow.

const MARKET_MAX_IMAGES = 4;
const MARKET_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MARKET_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MARKET_CATEGORIES = new Set(["books", "electronics", "fashion", "food", "services", "other"]);

export async function createMarketplaceListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);
  await assertMarketplaceEnabled(supabase, user.id);

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const priceNaira = Number(formData.get("price") ?? 0);
  const categoryRaw = String(formData.get("category") ?? "other");
  const category = MARKET_CATEGORIES.has(categoryRaw) ? categoryRaw : "other";
  const conditionRaw = String(formData.get("condition") ?? "");
  const condition = conditionRaw === "new" || conditionRaw === "used" ? conditionRaw : null;
  const contactWhatsapp = String(formData.get("contact_whatsapp") ?? "").trim().slice(0, 40) || null;
  const contactMeetup = String(formData.get("contact_meetup") ?? "").trim().slice(0, 120) || null;

  if (!title || !Number.isFinite(priceNaira) || priceNaira <= 0) return;

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0 && MARKET_IMAGE_TYPES.has(f.type))
    .slice(0, MARKET_MAX_IMAGES)
    .filter((f) => f.size <= MARKET_MAX_IMAGE_BYTES);

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      seller_id: user.id,
      title,
      description,
      price_kobo: Math.round(priceNaira * 100),
      category,
      condition,
      contact_whatsapp: contactWhatsapp,
      contact_meetup: contactMeetup,
    })
    .select("id")
    .single();

  if (error || !listing) return;

  if (images.length > 0) {
    const uploaded: { storage_path: string; position: number }[] = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const path = `${user.id}/${listing.id}/${i}-${Date.now()}.${extFromMime(file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from("marketplace-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!uploadError) uploaded.push({ storage_path: path, position: i });
    }
    if (uploaded.length > 0) {
      await supabase
        .from("marketplace_listing_media")
        .insert(uploaded.map((m) => ({ listing_id: listing.id, ...m })));
    }
  }

  revalidatePath("/marketplace");
  redirect(`/marketplace/${listing.id}`);
}

export async function setMarketplaceListingStatusAction(
  listingId: string,
  status: "active" | "sold" | "removed",
  path: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("marketplace_listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  revalidatePath(path);
  revalidatePath("/marketplace");
}

export async function deleteMarketplaceListingAction(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("marketplace_listings").delete().eq("id", listingId).eq("seller_id", user.id);
  revalidatePath("/marketplace");
  redirect("/marketplace");
}

export type ResolveBankAccountResult = { accountName: string } | { error: string };

// Lets the payout-account form show "is this you?" before saving anything.
export async function resolveBankAccountAction(bankCode: string, accountNumber: string): Promise<ResolveBankAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
    return { error: "Enter a valid 10-digit account number." };
  }

  const resolved = await resolveAccountName(bankCode, accountNumber);
  if (!resolved.ok) return { error: resolved.error };
  return { accountName: resolved.data.accountName };
}

export type PayoutAccountResult = { ok: true } | { error: string };

// A seller's payout destination. Creates (or updates) a Flutterwave
// subaccount for them — split_value: 1 means that subaccount gets 100% of
// any sale it's attached to, so money settles straight into the seller's
// own bank account rather than pooling in one UNDR-controlled account.
export async function savePayoutAccountAction(formData: FormData): Promise<PayoutAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bankCode = String(formData.get("bank_code") ?? "").trim();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();

  if (!bankCode || !bankName || !/^\d{10}$/.test(accountNumber)) {
    return { error: "Pick a bank and enter a valid 10-digit account number." };
  }

  const resolved = await resolveAccountName(bankCode, accountNumber);
  if (!resolved.ok) return { error: resolved.error };

  const { data: existing } = await supabase
    .from("marketplace_payout_accounts")
    .select("id, flutterwave_subaccount_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const subaccount = await createOrUpdateSubaccount({
    existingSubaccountId: existing?.flutterwave_subaccount_id ?? null,
    bankCode,
    accountNumber,
    // Flutterwave requires a business_name; anonymity is preserved since
    // this never appears anywhere buyer-facing — only used internally by
    // Flutterwave to label the subaccount.
    businessName: `UNDR Seller ${user.id.slice(0, 8)}`,
  });
  if (!subaccount.ok) return { error: subaccount.error };

  const row = {
    user_id: user.id,
    bank_code: bankCode,
    bank_name: bankName,
    account_number: accountNumber,
    account_name: resolved.data.accountName,
    flutterwave_subaccount_id: subaccount.data.subaccountId,
  };

  const { error } = existing
    ? await supabase.from("marketplace_payout_accounts").update(row).eq("id", existing.id)
    : await supabase.from("marketplace_payout_accounts").insert(row);

  if (error) return { error: "Saved with Flutterwave but couldn't save to your account. Try again." };

  revalidatePath("/marketplace/payout-account");
  return { ok: true };
}

export type MarketplaceCheckoutInit =
  | {
      orderId: string;
      txRef: string;
      amountNaira: number;
      buyerEmail: string;
      sellerSubaccountId: string;
    }
  | { error: string };

// Starts checkout: creates a pending order with a fresh tx_ref. This is the
// only marketplace-orders write a buyer's own browser session is ever
// allowed to make directly — everything past "pending" goes through
// verifyMarketplacePaymentAction below.
export async function createMarketplaceOrderAction(listingId: string): Promise<MarketplaceCheckoutInit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await assertLaunched(supabase, user.id);
  await assertMarketplaceEnabled(supabase, user.id);

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, price_kobo, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.status !== "active") return { error: "This listing isn't available anymore." };
  if (listing.seller_id === user.id) return { error: "You can't buy your own listing." };

  const { data: payoutAccount } = await supabase
    .from("marketplace_payout_accounts")
    .select("flutterwave_subaccount_id")
    .eq("user_id", listing.seller_id)
    .maybeSingle();

  if (!payoutAccount?.flutterwave_subaccount_id) {
    return { error: "The seller hasn't set up payouts yet — check back later." };
  }

  const txRef = `undr_${listing.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { data: order, error } = await supabase
    .from("marketplace_orders")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount_kobo: listing.price_kobo,
      payment_reference: txRef,
    })
    .select("id")
    .single();

  if (error || !order) return { error: "Couldn't start checkout. Try again." };

  return {
    orderId: order.id,
    txRef,
    amountNaira: listing.price_kobo / 100,
    buyerEmail: user.email ?? "buyer@undr.app",
    sellerSubaccountId: payoutAccount.flutterwave_subaccount_id,
  };
}

export type MarketplaceVerifyResult = { ok: true } | { error: string };

// The only path that can ever mark a marketplace order "paid". Re-verifies
// the transaction against Flutterwave's own API (status + amount + tx_ref
// all have to match) before writing anything, and the write itself uses
// the service-role client specifically because RLS has no client-reachable
// path to "paid" — see lib/supabase/service.ts.
export async function verifyMarketplacePaymentAction(
  orderId: string,
  transactionId: string,
  path: string
): Promise<MarketplaceVerifyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("marketplace_orders")
    .select("id, buyer_id, seller_id, listing_id, amount_kobo, status, payment_reference")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) return { error: "Order not found." };
  if (order.status === "paid") return { ok: true };
  if (order.status !== "pending") return { error: "This order can't be verified anymore." };

  const verified = await verifyTransaction(transactionId);
  if (!verified.ok) return { error: verified.error };

  const expectedNaira = order.amount_kobo / 100;
  if (
    verified.data.status !== "successful" ||
    verified.data.txRef !== order.payment_reference ||
    verified.data.currency !== "NGN" ||
    verified.data.amountNaira < expectedNaira
  ) {
    return { error: "Payment couldn't be verified." };
  }

  const service = createServiceClient();
  if (!service) {
    return { error: "Checkout isn't fully set up yet — ask an admin to add the Supabase service role key." };
  }

  const { error: updateError, data: updated } = await service
    .from("marketplace_orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending") // guards against a double-verify race
    .select("id")
    .maybeSingle();

  if (updateError || !updated) return { error: "Couldn't finalize the order. Try again." };

  await service
    .from("marketplace_listings")
    .update({ status: "sold" })
    .eq("id", order.listing_id)
    .eq("status", "active");

  await service.from("notifications").insert({
    user_id: order.seller_id,
    type: "system",
    message: "💰 Someone just paid for your marketplace listing — it settled straight to your bank account. Check My Sales to arrange handoff.",
  });

  revalidatePath(path);
  revalidatePath("/marketplace");
  revalidatePath("/marketplace/orders");
  return { ok: true };
}

export async function cancelMarketplaceOrderAction(orderId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("marketplace_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("status", "pending");

  revalidatePath(path);
  revalidatePath("/marketplace/orders");
}
