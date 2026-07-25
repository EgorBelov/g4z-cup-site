import "server-only";

import { writeClient } from "@/lib/supabase/write";
import { unwrap } from "@/lib/supabase/read";
import type {
  AuditEntry,
  Game,
  GameBan,
  GamePick,
  Group,
  Hero,
  MatchDetails,
  Placement,
  Award,
  Player,
  StandingRow,
  Stage,
  Team,
  Tournament,
} from "@/lib/types/database";

/**
 * Admin reads. Uncached and via the service role, so organisers always see the
 * true state — including draft tournaments that RLS hides from the public.
 */

export async function adminTournaments(): Promise<Tournament[]> {
  const result = await writeClient()
    .from("tournaments")
    .select("*")
    .order("edition", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return unwrap(result, "adminTournaments") as Tournament[];
}

export async function adminTournament(slug: string): Promise<Tournament | null> {
  const { data, error } = await writeClient()
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`adminTournament: ${error.message}`);
  return (data as Tournament | null) ?? null;
}

export async function adminStages(tournamentId: number): Promise<Stage[]> {
  const result = await writeClient()
    .from("stages")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order");

  return unwrap(result, "adminStages") as Stage[];
}

export async function adminGroups(tournamentId: number): Promise<Group[]> {
  const result = await writeClient()
    .from("groups")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order");

  return unwrap(result, "adminGroups") as Group[];
}

export async function adminTeams(tournamentId: number): Promise<Team[]> {
  const result = await writeClient()
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name");

  return unwrap(result, "adminTeams") as Team[];
}

export async function adminTeamWithPlayers(
  teamId: number,
): Promise<{ team: Team; players: Player[] } | null> {
  const client = writeClient();

  const { data: team, error } = await client
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(`adminTeamWithPlayers: ${error.message}`);
  if (!team) return null;

  const players = await client
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("sort_order");

  return {
    team: team as Team,
    players: unwrap(players, "adminTeamWithPlayers.players") as Player[],
  };
}

export async function adminMatches(
  tournamentId: number,
  filters: { stageId?: number; status?: string } = {},
): Promise<MatchDetails[]> {
  let query = writeClient()
    .from("match_details")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.status) query = query.eq("status", filters.status);

  const result = await query
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("stage_order")
    .order("round")
    .order("position");

  return unwrap(result, "adminMatches") as MatchDetails[];
}

export type AdminMatch = {
  match: MatchDetails;
  games: Game[];
  picks: GamePick[];
  bans: GameBan[];
  rosters: { team1: Player[]; team2: Player[] };
};

export async function adminMatch(matchId: number): Promise<AdminMatch | null> {
  const client = writeClient();

  const { data: match, error } = await client
    .from("match_details")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw new Error(`adminMatch: ${error.message}`);
  if (!match) return null;

  const typed = match as MatchDetails;

  const gamesResult = await client
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .order("game_number");

  const games = unwrap(gamesResult, "adminMatch.games") as Game[];
  const gameIds = games.map((game) => game.id);

  const [picks, bans, roster1, roster2] = await Promise.all([
    gameIds.length
      ? client.from("game_picks").select("*").in("game_id", gameIds).order("order_no")
      : Promise.resolve({ data: [] as GamePick[], error: null }),
    gameIds.length
      ? client.from("game_bans").select("*").in("game_id", gameIds).order("order_no")
      : Promise.resolve({ data: [] as GameBan[], error: null }),
    typed.team1_id
      ? client
          .from("players")
          .select("*")
          .eq("team_id", typed.team1_id)
          .order("sort_order")
      : Promise.resolve({ data: [] as Player[], error: null }),
    typed.team2_id
      ? client
          .from("players")
          .select("*")
          .eq("team_id", typed.team2_id)
          .order("sort_order")
      : Promise.resolve({ data: [] as Player[], error: null }),
  ]);

  return {
    match: typed,
    games,
    picks: unwrap(picks, "adminMatch.picks") as GamePick[],
    bans: unwrap(bans, "adminMatch.bans") as GameBan[],
    rosters: {
      team1: unwrap(roster1, "adminMatch.roster1") as Player[],
      team2: unwrap(roster2, "adminMatch.roster2") as Player[],
    },
  };
}

/** Matches for the live control screen: in progress first, then what's next. */
export async function adminLiveBoard(tournamentId: number): Promise<{
  live: MatchDetails[];
  next: MatchDetails[];
}> {
  const client = writeClient();

  const [live, next] = await Promise.all([
    client
      .from("match_details")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "live")
      .order("scheduled_at", { nullsFirst: false }),
    client
      .from("match_details")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  return {
    live: unwrap(live, "adminLiveBoard.live") as MatchDetails[],
    next: unwrap(next, "adminLiveBoard.next") as MatchDetails[],
  };
}

export async function adminStandings(tournamentId: number): Promise<StandingRow[]> {
  const result = await writeClient()
    .from("standings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("group_order")
    .order("wins", { ascending: false })
    .order("map_diff", { ascending: false })
    .order("team_name");

  return unwrap(result, "adminStandings") as StandingRow[];
}

export async function adminResults(tournamentId: number): Promise<{
  placements: Placement[];
  awards: Award[];
}> {
  const client = writeClient();

  const [placements, awards] = await Promise.all([
    client
      .from("placements")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("place"),
    client
      .from("awards")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order"),
  ]);

  return {
    placements: unwrap(placements, "adminResults.placements") as Placement[],
    awards: unwrap(awards, "adminResults.awards") as Award[],
  };
}

export async function heroes(): Promise<Hero[]> {
  const result = await writeClient().from("heroes").select("*").order("name");
  return unwrap(result, "heroes") as Hero[];
}

export async function adminAudit(limit = 100): Promise<AuditEntry[]> {
  const result = await writeClient()
    .from("audit_log")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);

  return unwrap(result, "adminAudit") as AuditEntry[];
}
