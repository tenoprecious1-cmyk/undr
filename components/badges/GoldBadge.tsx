"use client";

import { useId } from "react";

export default function GoldBadgeIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  const uid = useId();
  const gradId = `g-grad-${uid}`;
  const sheenId = `g-sheen-${uid}`;

  return (
    <span className={`badge-insignia inline-grid shrink-0 place-items-center rounded-[5px] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="3" y1="1" x2="21" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--gold-2)" />
            <stop offset="45%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--gold-3)" />
          </linearGradient>
          <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Crest/shield insignia — deliberately not a gold checkmark */}
        <path
          d="M12 1 L20.5 4.6 L19.2 14.4 L12 23 L4.8 14.4 L3.5 4.6 Z"
          fill={`url(#${gradId})`}
          stroke="#241a05"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M12 3.2 L18.6 6 L17.6 13.9 L12 20.5 L6.4 13.9 L5.4 6 Z"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.6"
        />
        <path
          d="M12 3.2 L12 20.5"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.5"
        />
        <path
          d="M7.6 12.6 L12 8.4 L16.4 12.6"
          fill="none"
          stroke="#241a05"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9.4 16 L12 13.6 L14.6 16" fill="none" stroke="#241a05" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.3 4.8 L12 1.3 L12 4.4 L5 7.2 Z" fill={`url(#${sheenId})`} opacity="0.6" />
      </svg>
      <span
        className="badge-sweep"
        style={{
          background:
            "linear-gradient(75deg, transparent 0%, rgba(255,241,199,0.65) 45%, transparent 90%)",
          width: "40%",
        }}
      />
    </span>
  );
}
