"use client";

import { useOptimistic, useTransition } from "react";
import { adminSetFeatureFlagAction } from "@/app/actions";

export default function FeatureFlagToggle({ flagKey, initialEnabled }: { flagKey: string; initialEnabled: boolean }) {
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        enabled ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
