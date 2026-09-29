import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}
