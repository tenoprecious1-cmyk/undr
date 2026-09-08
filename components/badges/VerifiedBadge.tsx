"use client";

import { useId } from "react";

export default function VerifiedBadgeIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  const uid = useId();
  const gradId = `v-grad-${uid}`;
  const glowId = `v-glow-${uid}`;

  return (
    <span className={`badge-insignia inline-grid shrink-0 place-items-center rounded-[5px] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--verified-2)" />
            <stop offset="55%" stopColor="var(--verified)" />
            <stop offset="100%" stopColor="#0d5bc9" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Geometric kite/hex insignia — deliberately not a circular checkmark */}
        <polygon
          points="12,1 19,6.2 19.6,13.5 13.6,22.5 10.4,22.5 4.4,13.5 5,6.2"
          fill={`url(#${gradId})`}
          stroke="#04101f"
          strokeWidth="1"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        <polygon
          points="12,3.1 17.3,7.1 17.8,13.1 13,20.4 11,20.4 6.2,13.1 6.7,7.1"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.6"
        />
        <path
          d="M8.4 12.3 L11 14.9 L16 8.7"
          fill="none"
          stroke="#f5faff"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="badge-sweep"
        style={{
          background:
            "linear-gradient(75deg, transparent 0%, rgba(255,255,255,0.55) 45%, transparent 90%)",
          width: "40%",
        }}
      />
    </span>
  );
}
