import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Summary bar skeleton */}
      <div className="flex gap-4 p-4 rounded-xl border bg-card">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      {/* Map skeleton */}
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

export { Skeleton };
