"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { can, isAnyAdmin } from "@/lib/permissions";
import { fetchPlatformSettings, fetchReplies } from "@/lib/queries";
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
