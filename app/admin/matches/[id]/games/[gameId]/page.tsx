import Link from "next/link";
import { updateMatchGameDraftAction } from "@/app/admin/actions";
import {
  getAdminMatchById,
  getAdminMatchGameBans,
  getAdminMatchGameById,
  getAdminMatchGamePicks,
} from "@/lib/queries/admin";

type AdminMatch = {
  id: number;
  round_name: string;
  stage: string;
  group_name: string | null;
  team1_id: number | null;
  team1_name: string | null;
  team2_id: number | null;
  team2_name: string | null;
};

type AdminGame = {
  id: number;
  match_id: number;
  game_number: number;
};

type PickRow = {
  id: number;
  team_id: number;
  player_name: string;
  hero_name: string;
  pick_order: number;
};

type BanRow = {
  id: number;
  team_id: number;
  hero_name: string;
  ban_order: number;
};

function getPickValue(
  picks: PickRow[],
  teamId: number | null,
  order: number
): { player_name: string; hero_name: string } {
  const row = picks.find((p) => p.team_id === teamId && p.pick_order === order);
  return {
    player_name: row?.player_name ?? "",
    hero_name: row?.hero_name ?? "",
  };
}

function getBanValue(bans: BanRow[], teamId: number | null, order: number): string {
  return bans.find((b) => b.team_id === teamId && b.ban_order === order)?.hero_name ?? "";
}

export default async function AdminMatchGamePage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;

  const matchId = Number(id);
  const parsedGameId = Number(gameId);

  const [match, game, picks, bans] = await Promise.all([
    getAdminMatchById(matchId),
    getAdminMatchGameById(parsedGameId),
    getAdminMatchGamePicks(parsedGameId),
    getAdminMatchGameBans(parsedGameId),
  ]);

  const typedMatch = match as AdminMatch;
  const typedGame = game as AdminGame;
  const typedPicks = picks as PickRow[];
  const typedBans = bans as BanRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Game {typedGame.game_number} — Picks / Bans
          </h1>
          <p className="mt-3 text-white/65">
            {typedMatch.team1_name ?? "TBD"} vs {typedMatch.team2_name ?? "TBD"}
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href={`/admin/matches/${matchId}`}
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Назад к матчу
            </Link>
            <Link
              href={`/matches/${matchId}`}
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Открыть публичную страницу
            </Link>
          </div>
        </div>

        <form
          action={updateMatchGameDraftAction}
          className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="game_id" value={parsedGameId} />
          <input type="hidden" name="team1_id" value={typedMatch.team1_id ?? ""} />
          <input type="hidden" name="team2_id" value={typedMatch.team2_id ?? ""} />

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="mb-4 text-2xl font-bold">
                {typedMatch.team1_name ?? "Team 1"}
              </h2>

              <div>
                <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
                  Picks
                </div>

                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => {
                    const order = i + 1;
                    const value = getPickValue(typedPicks, typedMatch.team1_id, order);

                    return (
                      <div key={order} className="grid gap-3 md:grid-cols-2">
                        <input
                          name={`team1_pick_player_${order}`}
                          defaultValue={value.player_name}
                          placeholder={`Игрок ${order}`}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                        />
                        <input
                          name={`team1_pick_hero_${order}`}
                          defaultValue={value.hero_name}
                          placeholder={`Герой ${order}`}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
                  Bans
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const order = i + 1;
                    return (
                      <input
                        key={order}
                        name={`team1_ban_${order}`}
                        defaultValue={getBanValue(typedBans, typedMatch.team1_id, order)}
                        placeholder={`Ban ${order}`}
                        className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="mb-4 text-2xl font-bold">
                {typedMatch.team2_name ?? "Team 2"}
              </h2>

              <div>
                <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
                  Picks
                </div>

                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => {
                    const order = i + 1;
                    const value = getPickValue(typedPicks, typedMatch.team2_id, order);

                    return (
                      <div key={order} className="grid gap-3 md:grid-cols-2">
                        <input
                          name={`team2_pick_player_${order}`}
                          defaultValue={value.player_name}
                          placeholder={`Игрок ${order}`}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                        />
                        <input
                          name={`team2_pick_hero_${order}`}
                          defaultValue={value.hero_name}
                          placeholder={`Герой ${order}`}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
                  Bans
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const order = i + 1;
                    return (
                      <input
                        key={order}
                        name={`team2_ban_${order}`}
                        defaultValue={getBanValue(typedBans, typedMatch.team2_id, order)}
                        placeholder={`Ban ${order}`}
                        className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
            >
              Сохранить picks / bans
            </button>

            <Link
              href={`/admin/matches/${matchId}`}
              className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/15"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}