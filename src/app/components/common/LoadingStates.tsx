import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";

export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return <span className="inline-flex items-center gap-2" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /><span>{label}</span></span>;
}

export function RouteLoader() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-44 rounded-xl" /><Skeleton className="h-4 w-64 max-w-[70vw] rounded-lg" /></div>
        <Skeleton className="h-11 w-32 rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-80 rounded-3xl xl:col-span-2" /><Skeleton className="h-80 rounded-3xl" /></div>
    </div>
  );
}

export function AppDataSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading hospital data">
      <span className="sr-only">Loading hospital data</span>
      <Skeleton className="h-11 w-full rounded-2xl" />
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}
    </div>
  );
}
