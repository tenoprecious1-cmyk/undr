export default function ComingSoon({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="mt-4 text-2xl font-bold text-text">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-text-dim">{description}</p>
      <span className="mt-6 rounded-full border border-border-soft bg-surface/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
        Coming soon to UNDR
      </span>
    </div>
  );
}
