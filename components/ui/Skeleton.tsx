export function MediaCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="aspect-[2/3] w-full bg-white/5" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}