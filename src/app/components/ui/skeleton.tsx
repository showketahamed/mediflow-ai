import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer overflow-hidden rounded-md bg-white/[0.06]", className)}
      {...props}
    />
  );
}

export { Skeleton };
