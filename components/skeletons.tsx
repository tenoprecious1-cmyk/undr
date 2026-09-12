// Lightweight, reusable loading-skeleton pieces used by the route-level
// loading.tsx files across the app. These render instantly on navigation
// (before any data has loaded) so a click always gets immediate visual
// feedback instead of looking frozen.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-2/70 ${className}`} />;
}

export function PostRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border-soft px-4 py-4 sm:px-5">
      <Bar className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Bar className="h-3 w-32" />
        <Bar className="mt-3 h-3.5 w-full" />
        <Bar className="mt-2 h-3.5 w-4/5" />
        <div className="mt-4 flex max-w-md items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bar key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <Bar className="h-6 w-40" />
      <Bar className="h-3.5 w-64" />
      <div className="mt-4 flex flex-col gap-3">
        <Bar className="h-24 w-full rounded-2xl" />
        <Bar className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-6 flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface/40 p-3">
          <Bar className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Bar className="h-3 w-1/3" />
            <Bar className="mt-2 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <Bar className="h-6 w-48" />
      <Bar className="mt-2 h-3.5 w-72" />
      <ListRowsSkeleton count={rows} />
    </div>
  );
}
