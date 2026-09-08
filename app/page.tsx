import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="flex items-center gap-2 text-lg font-bold text-text">
          <span className="text-xl">🕳️</span> UNDR
        </span>
        <Link
          href="/login"
          className="rounded-full border border-border-soft px-4 py-2 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
        >
          Log in
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-5 rounded-full border border-border-soft bg-surface/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-text-faint">
          You weren&apos;t supposed to find this
        </p>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-text sm:text-7xl">
          The other side<br />of <span className="text-accent-2">Bowen</span>.
        </h1>
        <p className="mt-6 max-w-md text-base text-text-dim sm:text-lg">
          Anonymous. Fast. Funny. Unfiltered. Everything happens UNDR. 🕳️🔥
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.7)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Enter UNDR →
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border-soft px-8 py-3.5 text-[15px] font-semibold text-text transition hover:bg-surface"
          >
            I already have an identity
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { emoji: "🔥", label: "Trending" },
            { emoji: "⚔️", label: "Face-Off" },
            { emoji: "😂", label: "Chaos" },
            { emoji: "🏷️", label: "Gist" },
          ].map((i) => (
            <div
              key={i.label}
              className="rounded-2xl border border-border-soft bg-surface/40 px-4 py-5 text-sm font-semibold text-text-dim"
            >
              <div className="text-2xl">{i.emoji}</div>
              <div className="mt-2">{i.label}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-text-faint">
        UNDR is not affiliated with Bowen University administration. It's the internet students made for themselves.
      </footer>
    </div>
  );
}
