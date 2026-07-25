import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { MatchStatus, TournamentStatus } from "@/lib/types/database";

const tones = {
  neutral: "border-edge bg-panel text-ink-muted",
  accent: "border-accent/30 bg-accent-soft text-accent",
  live: "border-live/40 bg-live-soft text-live",
  info: "border-info/30 bg-info-soft text-info",
  warn: "border-warn/30 bg-warn-soft text-warn",
} as const;

export type Tone = keyof typeof tones;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const matchLabels: Record<MatchStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "по расписанию", tone: "neutral" },
  live: { label: "идёт сейчас", tone: "live" },
  finished: { label: "завершён", tone: "accent" },
  cancelled: { label: "отменён", tone: "warn" },
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config = matchLabels[status];

  return (
    <Badge tone={config.tone}>
      {status === "live" ? (
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-live" />
      ) : null}
      {config.label}
    </Badge>
  );
}

const tournamentLabels: Record<TournamentStatus, { label: string; tone: Tone }> = {
  draft: { label: "черновик", tone: "warn" },
  upcoming: { label: "анонс", tone: "info" },
  live: { label: "идёт", tone: "live" },
  finished: { label: "завершён", tone: "neutral" },
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const config = tournamentLabels[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
