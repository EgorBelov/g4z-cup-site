import { emblemFor } from "@/lib/team-mark";
import { cn } from "@/lib/utils/cn";

/**
 * Team emblem.
 *
 * One uniform frame for every team: a 100×100 viewBox, the same optical size and
 * centring, and `currentColor` for the fill so the surrounding text colour (the
 * site accent) decides the shade. Decorative by default — the team name is
 * always rendered next to it in text.
 */
export function TeamEmblem({
  slug,
  size = 32,
  className,
  labelled = false,
}: {
  slug: string;
  size?: number;
  className?: string;
  labelled?: boolean;
}) {
  const emblem = emblemFor(slug);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      data-team-emblem={emblem.id}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {labelled ? <title>{emblem.label}</title> : null}
      <path d={emblem.path} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
