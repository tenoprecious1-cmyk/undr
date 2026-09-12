"use client";

import { useOptimistic, useTransition } from "react";
import { adminSetFeatureFlagAction } from "@/app/actions";

export default function FeatureFlagToggle({
  flagKey,
  initialEnabled,
  name,
}: {
  flagKey: string;
  initialEnabled: boolean;
  name: string;
}) {
  const [, startTransition] = useTransition();
  const [enabled, setEnabled] = useOptimistic(initialEnabled, (_state, next: boolean) => next);

  function onToggle() {
    const next = !enabled;
    startTransition(async () => {
      setEnabled(next);
      await adminSetFeatureFlagAction(flagKey, next);
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl py-1.5 text-left transition hover:bg-surface-2/60"
    >
      <span className="text-sm text-text">{name}</span>
      <span
        className={`relative grid h-8 w-14 shrink-0 place-items-center rounded-full transition-colors ${
          enabled ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute left-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
