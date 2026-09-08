export type VerificationStatus = "not_verified" | "pending" | "verified" | "revoked";
export type OnboardingTourStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type Profile = {
  id: string;
  animal: string;
  emoji: string;
  tag_number: number;
  level: string | null;
  faculty: string | null;
  department: string | null;
  media_approved: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
  gold_status: boolean;
  gold_awarded_at: string | null;
  gold_reason: string | null;
  gold_reason_public: boolean;
  onboarding_tour_status: OnboardingTourStatus;
  joined_at: string;
};

// ============ PLATFORM CONTROL ============

export type PlatformMode = "pre_launch" | "open";
export type PlatformPhase = "underground" | "social" | "open";
export type IdentityMode = "anonymous" | "alias" | "real";

export type PlatformSettings = {
  id: true;
  mode: PlatformMode;
  launch_counter: number;
  prelaunch_message_enabled: boolean;
  prelaunch_counter_enabled: boolean;
  platform_phase: PlatformPhase;
  identity_mode: IdentityMode;
  followers_enabled: boolean;
  following_enabled: boolean;
  profile_pictures_enabled: boolean;
  opened_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

// ============ RBAC ============

export type RoleKey = "super_admin" | "admin" | "moderator";

export type PermissionKey =
  | "manage_admins"
  | "manage_platform_settings"
  | "manage_users"
  | "manage_badges"
  | "moderate_content"
  | "manage_content"
  | "view_analytics"
  | "review_reports"
  | "hide_content"
  | "warn_users"
  | "restrict_users"
  | "lock_threads"
  | "freeze_replies";

export type Role = {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
};

export type Permission = {
  id: string;
  key: PermissionKey;
  description: string | null;
};

export type UserRoleEntry = {
  user_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  role: Role;
  user: Profile | null;
};

export type AdminActivityLogEntry = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  reason: string | null;
  previous_state: unknown;
  new_state: unknown;
  created_at: string;
  admin: Profile | null;
};

// ============ FEATURED CONTENT ============

export type PromoType = "featured" | "admin_pick" | "pinned" | "trending" | "drop_of_day";

export type PostPromotion = {
  id: string;
  post_id: string;
  promo_type: PromoType;
  reason: string | null;
  created_by: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  active: boolean;
};

export const PROMO_LABELS: Record<PromoType, string> = {
  featured: "🔥 FEATURED BY UNDR",
  admin_pick: "⭐ ADMIN PICK",
  pinned: "📌 PINNED",
  trending: "🔥 TRENDING",
  drop_of_day: "🏆 DROP OF THE DAY",
};

export type BadgeCatalogEntry = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  created_at: string;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_key: string;
  awarded_at: string;
  awarded_by: string | null;
  reason: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  badge: BadgeCatalogEntry;
};

export type BadgeAuditAction =
  | "gold_awarded"
  | "gold_revoked"
  | "verification_changed"
  | "badge_awarded"
  | "badge_revoked";

export type BadgeAuditEntry = {
  id: string;
  target_user_id: string;
  admin_id: string | null;
  action: BadgeAuditAction;
  badge_key: string | null;
  reason: string | null;
  reason_public: boolean;
  previous_value: string | null;
  new_value: string | null;
  created_at: string;
  target: Profile | null;
  admin: Profile | null;
};

export type BadgeStats = {
  verifiedCount: number;
  goldCount: number;
  achievementCount: number;
};

// ============ FEATURE CONTROL ============

export type FeatureCategory = "core_social" | "culture";

export type FeatureFlag = {
  key: string;
  name: string;
  category: FeatureCategory;
  enabled: boolean;
  updated_by: string | null;
  updated_at: string;
};

// The "culture" flags that are actually enforced in the student-facing UI
// (hidden from routes/nav/composer when off). Core-social flags are shown
// in the admin panel for visibility but aren't wired to gate anything yet —
// see components/CleanShot and app/(app)/{faceoff,rooms,chaos} for the
// enforced ones.
export type CultureFeatureKey = "faceoff" | "rooms" | "chaos" | "undr_pulse" | "random_drop" | "drop_of_day";

export type AdminStats = {
  totalUsers: number;
  postsToday: number;
  totalPosts: number;
  activeRooms: number;
  activeLinkups: number;
  totalFaceoffs: number;
};

export type AdminPost = {
  id: string;
  content: string;
  category: PostCategory;
  created_at: string;
  author: Profile;
};

export type AdminRoomMessage = {
  id: string;
  room_id: string;
  content: string;
  created_at: string;
  author: Profile;
  room: { name: string } | null;
};

export type PostCategory = "gist" | "chaos";

export type PollOption = {
  id: string;
  label: string;
  position: number;
  vote_count: number;
};

export type MediaType = "image" | "video";

export type PostMedia = {
  id: string;
  post_id: string;
  media_type: MediaType;
  storage_path: string;
  position: number;
  width: number | null;
  height: number | null;
  url: string;
};

export type Post = {
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
  hashtags: string[];
  poll_options?: PollOption[];
  media: PostMedia[];
  viewer_reacted: boolean;
  viewer_bookmarked: boolean;
  viewer_reposted: boolean;
  viewer_voted_option_id?: string | null;
  promotion?: PostPromotion | null;
};

export type Hashtag = {
  id: string;
  tag: string;
  post_count: number;
  last_used_at: string;
};

export type FaceOff = {
  id: string;
  question: string;
  yes_label: string;
  no_label: string;
  status: "scheduled" | "live" | "ended";
  yes_count: number;
  no_count: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  viewer_side?: "yes" | "no" | null;
};

export type Room = {
  id: string;
  name: string;
  emoji: string;
  topic: string | null;
  creator_id: string | null;
  message_count: number;
  created_at: string;
  expires_at: string;
};

export type RoomMessage = {
  id: string;
  room_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Profile;
};

export type Linkup = {
  id: string;
  author_id: string;
  activity: string;
  location: string | null;
  vibe_emoji: string;
  starts_at: string;
  expires_at: string;
  im_down_count: number;
  created_at: string;
  author: Profile;
  viewer_down: boolean;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "reaction" | "reply" | "repost" | "faceoff" | "system";
  post_id: string | null;
  faceoff_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor: Profile | null;
};

export function identityHandle(p: Pick<Profile, "animal" | "tag_number">) {
  return `Anonymous ${p.animal} #${p.tag_number}`;
}

export function identityShort(p: Pick<Profile, "animal" | "tag_number">) {
  return `${p.animal} #${p.tag_number}`;
}

const ANIMALS = [
  "Fox", "Wolf", "Frog", "Lion", "Owl", "Panda", "Tiger", "Bear",
  "Raven", "Shark", "Cobra", "Falcon", "Otter", "Lynx", "Badger",
  "Hedgehog", "Bat", "Rhino", "Puma", "Viper",
] as const;

const EMOJI: Record<string, string> = {
  Fox: "🦊", Wolf: "🐺", Frog: "🐸", Lion: "🦁", Owl: "🦉", Panda: "🐼",
  Tiger: "🐯", Bear: "🐻", Raven: "🐦‍⬛", Shark: "🦈", Cobra: "🐍",
  Falcon: "🦅", Otter: "🦦", Lynx: "🐆", Badger: "🦡", Hedgehog: "🦔",
  Bat: "🦇", Rhino: "🦏", Puma: "🐆", Viper: "🐍",
};

export function animalEmoji(animal: string) {
  return EMOJI[animal] ?? "🕳️";
}

export { ANIMALS };
