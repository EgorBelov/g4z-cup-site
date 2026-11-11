import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { getPublicCommunityTeam } from "@/lib/queries/public";
export default async function PublicCommunityTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const team = await getPublicCommunityTeam((await params).slug);
  if (!team) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow">Команда сообщества {team.tag ? `· ${team.tag}` : ""}</p>
        <h1 className="page-title mt-3">{team.name}</h1>
        {team.description ? (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {team.description}
          </p>
        ) : null}
        {team.archived ? (
          <p className="mt-4 text-sm text-ink-muted">
            Команда закрыта. История участия сохранена.
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Главный капитан", player: team.main_captain },
          { label: "Второй капитан", player: team.second_captain },
        ].map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-xs text-ink-muted">{c.label}</p>
            <p className="mt-3 text-lg">
              {c.player ? `${c.player.nickname} · P${c.player.code}` : "Не назначен"}
            </p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="mb-5 text-2xl">История участия</h2>
        <div className="flex flex-wrap gap-3">
          {team.participations.map((p) => (
            <ButtonLink
              key={p.slug}
              href={`/t/${p.slug}/teams/${p.team_slug}`}
              variant="secondary"
            >
              {p.name} ↗
            </ButtonLink>
          ))}
        </div>
        {!team.participations.length ? (
          <p className="text-sm text-ink-muted">Принятых турнирных заявок пока нет.</p>
        ) : null}
      </Card>
    </div>
  );
}
