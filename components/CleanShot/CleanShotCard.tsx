import { forwardRef } from "react";
import type { Post, Profile } from "@/lib/types";
import { identityHandle } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export type CleanShotReply = {
  id: string;
  content: string;
  created_at: string;
  author: Profile;
};

type Palette = {
  bg: string;
  card: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  hashtag: string;
  divider: string;
};

const DARK: Palette = {
  bg: "#0a0a0c",
  card: "#111114",
  border: "#26262d",
  text: "#f2f1f4",
  textDim: "#9a98a3",
  textFaint: "#656370",
  hashtag: "#a78bfa",
  divider: "#1d1d22",
};

const LIGHT: Palette = {
  bg: "#ffffff",
  card: "#ffffff",
  border: "#e6e6ea",
  text: "#15151a",
  textDim: "#5c5c66",
  textFaint: "#8f8f99",
  hashtag: "#7c3aed",
  divider: "#eeeef1",
};

function badgeGlyphs(profile: Pick<Profile, "verification_status" | "gold_status">): string {
  let out = "";
  if (profile.verification_status === "verified") out += " 🔷";
  if (profile.gold_status) out += " 🥇";
  return out;
}

function renderContentParts(content: string, hashtagColor: string) {
  const parts = content.split(/(#[A-Za-z0-9_]{2,50})/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} style={{ color: hashtagColor, fontWeight: 600 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const CleanShotCard = forwardRef<
  HTMLDivElement,
  {
    post: Post;
    style: "dark" | "light";
    includeEngagement: boolean;
    replies: CleanShotReply[];
    width?: number;
  }
>(function CleanShotCard({ post, style, includeEngagement, replies, width = 480 }, ref) {
  const p = style === "dark" ? DARK : LIGHT;
  const firstImage = post.media.find((m) => m.media_type === "image");

  return (
    <div
      ref={ref}
      style={{
        width,
        background: p.bg,
        color: p.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
        border: `1px solid ${p.border}`,
        borderRadius: 20,
        padding: 24,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: style === "dark" ? "rgba(139,92,246,0.14)" : "rgba(124,58,237,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {post.author.emoji}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {identityHandle(post.author)}
            <span style={{ fontSize: 13 }}>{badgeGlyphs(post.author)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: p.textFaint, marginTop: 1 }}>
            {timeAgo(post.created_at)}
          </div>
        </div>
      </div>

      {/* content */}
      {post.content && (
        <div
          style={{
            marginTop: 14,
            fontSize: 18,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {renderContentParts(post.content, p.hashtag)}
        </div>
      )}

      {/* media */}
      {firstImage && (
        <div style={{ marginTop: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${p.border}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstImage.url}
            alt=""
            crossOrigin="anonymous"
            style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* engagement */}
      {includeEngagement && (
        <div style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 13.5, color: p.textDim }}>
          <span>❤️ {post.reaction_count}</span>
          <span>💬 {post.reply_count}</span>
          <span>🔁 {post.repost_count}</span>
        </div>
      )}

      {/* replies */}
      {replies.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${p.divider}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {replies.map((r) => (
              <div key={r.id} style={{ fontSize: 13.5 }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{r.author.emoji}</span>
                  <span>{identityHandle(r.author)}</span>
                  <span style={{ fontSize: 11 }}>{badgeGlyphs(r.author)}</span>
                </div>
                <div style={{ marginTop: 2, color: p.textDim, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  &ldquo;{r.content}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* branding */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: `1px solid ${p.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13 }}>🕳️</span>
        <div style={{ textAlign: "right", lineHeight: 1.15 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3 }}>UNDR</div>
          <div style={{ fontSize: 9.5, color: p.textFaint }}>The other side of Bowen.</div>
        </div>
      </div>
    </div>
  );
});

export default CleanShotCard;
