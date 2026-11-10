import { cn } from "@/lib/utils/cn";

/** Shared vector artwork traced from the first reference in work/logo.jpg. */
export function BrandMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
      className={cn("text-ink", className)}
    >
      <use href="/brand/g4z-cup.svg#globe" />
      <circle
        cx={animated ? 0 : 596}
        cy={animated ? 0 : 133}
        r="15"
        className={cn("fill-accent", animated && "orbit-dot")}
      />
    </svg>
  );
}
