"use client";

import { useEffect, useRef, useState } from "react";
import { setOnboardingTourStatusAction } from "@/app/actions";
import type { OnboardingTourStatus } from "@/lib/types";

type Step = {
  tour: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  { tour: "home", title: "THIS IS HOME", body: "This is where the campus gist lives." },
  { tour: "trending", title: "WHAT'S HOT?", body: "See what Bowen is talking about right now." },
  { tour: "explore", title: "EXPLORE UNDR", body: "Find fresh drops, polls, chaos and conversations." },
  { tour: "drop", title: "DROP SOMETHING", body: "Got something to say? Drop it." },
  { tour: "faceoff", title: "PICK A SIDE.", body: "Choose a side, make your argument and let the community decide." },
  { tour: "rooms", title: "ENTER A ROOM", body: "Temporary spaces for specific campus conversations." },
  { tour: "bookmarks", title: "SAVE IT FOR LATER", body: "Save posts, threads and polls." },
  { tour: "profile", title: "THIS IS YOU", body: "This is your UNDR persona." },
];

type Phase = "closed" | "intro" | "step" | "outro";

export default function OnboardingTour({
  status,
  faceoffEnabled = true,
  roomsEnabled = true,
}: {
  status: OnboardingTourStatus;
  faceoffEnabled?: boolean;
  roomsEnabled?: boolean;
}) {
  const steps = STEPS.filter((s) => {
    if (s.tour === "faceoff") return faceoffEnabled;
    if (s.tour === "rooms") return roomsEnabled;
    return true;
  });
  const [phase, setPhase] = useState<Phase>("closed");
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (status === "not_started") setPhase("intro");
  }, [status]);

  useEffect(() => {
    if (phase !== "step") return;
    const step = steps[stepIndex];
    const el = document.querySelector(`[data-tour="${step.tour}"]`);
    const update = () => setRect(el ? el.getBoundingClientRect() : null);
    update();
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [phase, stepIndex]);

  if (phase === "closed") return null;

  const start = async () => {
    setPhase("step");
    setStepIndex(0);
    await setOnboardingTourStatusAction("in_progress");
  };

  const skip = async () => {
    setPhase("closed");
    await setOnboardingTourStatusAction("skipped");
  };

  const next = () => {
    if (stepIndex + 1 < steps.length) {
      setStepIndex((i) => i + 1);
    } else {
      setPhase("outro");
    }
  };

  const finish = async () => {
    setPhase("closed");
    await setOnboardingTourStatusAction("completed");
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

      {phase === "intro" && (
        <div className="relative z-10 flex h-full items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl border border-border-soft bg-surface p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold text-text">WELCOME TO UNDR.</p>
            <p className="mt-1 text-sm text-text-dim">The other side of Bowen.</p>
            <p className="mt-4 text-sm text-text-faint">Before you enter, let&apos;s show you around. 👀</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={start}
                className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110"
              >
                SHOW ME AROUND
              </button>
              <button onClick={skip} className="rounded-full px-4 py-3 text-sm font-semibold text-text-faint hover:text-text">
                SKIP TOUR
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "step" && (
        <TourSpotlight step={steps[stepIndex]} rect={rect} index={stepIndex} total={steps.length} onNext={next} onSkip={skip} />
      )}

      {phase === "outro" && (
        <div className="relative z-10 flex h-full items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl border border-border-soft bg-surface p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold text-text">YOU&apos;RE IN. 🖤</p>
            <p className="mt-2 text-sm text-text-dim">You know your way around UNDR.</p>
            <p className="text-sm text-text-dim">Now go see what&apos;s happening.</p>
            <button
              onClick={finish}
              className="mt-6 w-full rounded-full bg-accent px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110"
            >
              ENTER UNDR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TourSpotlight({
  step,
  rect,
  index,
  total,
  onNext,
  onSkip,
}: {
  step: Step;
  rect: DOMRect | null;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const pad = 8;
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const cardTop = rect
    ? Math.min(Math.max(rect.bottom + 16, 16), Math.max(16, viewportHeight - cardHeight - 16))
    : undefined;

  return (
    <div className="relative z-10 h-full w-full">
      {rect && (
        <div
          className="pointer-events-none absolute rounded-2xl ring-4 ring-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="absolute left-1/2 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border border-border-soft bg-surface p-5 shadow-2xl"
        style={{ top: cardTop ?? "50%", transform: cardTop ? "translateX(-50%)" : "translate(-50%, -50%)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-accent-2">
          Step {index + 1} of {total}
        </p>
        <p className="mt-1.5 text-lg font-bold text-text">{step.title}</p>
        <p className="mt-1 text-sm text-text-dim">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={onSkip} className="text-xs font-semibold text-text-faint hover:text-text">
            Skip tour
          </button>
          <button
            onClick={onNext}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            {index + 1 === total ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
