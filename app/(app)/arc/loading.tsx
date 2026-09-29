import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-28" />
      <div className="mt-8 border-t border-line pt-7">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="mt-3 h-4 w-44" />
        <Skeleton className="mt-4 h-4 w-24" />
        <div className="mt-6 space-y-5 border-y border-line py-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className={i % 2 ? "h-4 w-36" : "h-4 w-48"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
