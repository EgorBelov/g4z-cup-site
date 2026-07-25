import { cacheLife, cacheTag } from "next/cache";
import {
  describeError,
  isSupabaseConfigured,
  readClient,
  unwrap,
} from "@/lib/supabase/read";
import { tags } from "@/lib/cache/tags";
import type {
  Award,
  Game,
  Group,
  GameBan,
  GamePick,
  MatchDetails,
  Placement,
  Player,
  StandingRow,
  Stage,
  Team,
  Tournament,
  TournamentSummary,
} from "@/lib/types/database";

/**
 * Public reads.
 *
 * Every function is a `use cache` scope tagged with what it depends on, so a
 * page load is served from the prerendered shell and Supabase is only touched
 * when an admin write invalidates the tag.
 * node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md
 */

const MATCH_COLUMNS = "*";

export async function getCurrentTournament(): Promise<Tournament | null> {
  "use cache";
  cacheTag(tags.tournaments());
  cacheLife("hours");

  if (!isSupabaseConfigured()) return null;

  const { data, error } = await readClient()
    .from("tournaments")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw new Error(`getCurrentTournament: ${describeError(error.message)}`);
  return (data as Tournament | null) ?? null;
}

export async function getTournament(slug: string): Promise<Tournament | null> {
  "use cache";
  cacheTag(tags.tournament(slug));
  cacheLife("hours");

  if (!isSupabaseConfigured()) return null;

  const { data, error } = await readClient()
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getTournament(${slug}): ${describeError(error.message)}`);
  return (data as Tournament | null) ?? null;
}

export async function listTournaments(): Promise<TournamentSummary[]> {
  "use cache";
  cacheTag(tags.tournaments());
  cacheLife("hours");

  if (!isSupabaseConfigured()) return [];

  const result = await readClient()
    .from("tournament_summaries")
    .select("*")
    .order("edition", { ascending: false, nullsFirst: false })
    .order("starts_at", { ascending: false, nullsFirst: false });

  return unwrap(result, "listTournaments") as TournamentSummary[];
}

export async function getStages(slug: string): Promise<Stage[]> {
  "use cache";
  cacheTag(tags.structure(slug));
  cacheLife("hours");

  const tournament = await getTournament(slug);
  if (!tournament) return [];

  const result = await readClient()
    .from("stages")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order");

  return unwrap(result, "getStages") as Stage[];
}

export async function getTeams(slug: string): Promise<Team[]> {
  "use cache";
  cacheTag(tags.teams(slug));
  cacheLife("hours");

  const tournament = await getTournament(slug);
  if (!tournament) return [];

  const result = await readClient()
    .from("teams")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name");

  return unwrap(result, "getTeams") as Team[];
}

/** Rosters and groups for the teams listing, in one cached round trip. */
export async function getRosters(slug: string): Promise<{
  players: Player[];
  groups: Group[];
}> {
  "use cache";
  cacheTag(tags.teams(slug));
  cacheLife("hours");

  const tournament = await getTournament(slug);
  if (!tournament) return { players: [], groups: [] };

  const client = readClient();
  const teams = await getTeams(slug);
  const teamIds = teams.map((team) => team.id);

  const [players, groups] = await Promise.all([
    teamIds.length
      ? client.from("players").select("*").in("team_id", teamIds).order("sort_order")
      : Promise.resolve({ data: [] as Player[], error: null }),
    client
      .from("groups")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("sort_order"),
  ]);

  return {
    players: unwrap(players, "getRosters.players") as Player[],
    groups: unwrap(groups, "getRosters.groups") as Group[],
  };
}

export type TeamPage = {
  team: Team;
  players: Player[];
  matches: MatchDetails[];
};

export async function getTeamPage(
  tournamentSlug: string,
  teamSlug: string,
): Promise<TeamPage | null> {
  "use cache";
  cacheTag(tags.teams(tournamentSlug), tags.matches(tournamentSlug));
  cacheLife("minutes");

  const tournament = await getTournament(tournamentSlug);
  if (!tournament) return null;

  const client = readClient();

  const { data: team, error } = await client
    .from("teams")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("slug", teamSlug)
    .maybeSingle();

  if (error) throw new Error(`getTeamPage: ${describeError(error.message)}`);
  if (!team) return null;

  const typedTeam = team as Team;

  const [players, matches] = await Promise.all([
    client.from("players").select("*").eq("team_id", typedTeam.id).order("sort_order"),
    client
      .from("match_details")
      .select(MATCH_COLUMNS)
      .eq("tournament_id", tournament.id)
      .or(`team1_id.eq.${typedTeam.id},team2_id.eq.${typedTeam.id}`)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("position"),
  ]);

  return {
    team: typedTeam,
    players: unwrap(players, "getTeamPage.players") as Player[],
    matches: unwrap(matches, "getTeamPage.matches") as MatchDetails[],
  };
}

export async function getSchedule(slug: string): Promise<MatchDetails[]> {
  "use cache";
  cacheTag(tags.matches(slug));
  cacheLife("minutes");

  const tournament = await getTournament(slug);
  if (!tournament) return [];

  const result = await readClient()
    .from("match_details")
    .select(MATCH_COLUMNS)
    .eq("tournament_id", tournament.id)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("stage_order")
    .order("round")
    .order("position");

  return unwrap(result, "getSchedule") as MatchDetails[];
}

export async function getStandings(slug: string): Promise<StandingRow[]> {
  "use cache";
  cacheTag(tags.matches(slug));
  cacheLife("minutes");

  const tournament = await getTournament(slug);
  if (!tournament) return [];

  const result = await readClient()
    .from("standings")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("group_order")
    .order("wins", { ascending: false })
    .order("map_diff", { ascending: false })
    .order("team_name");

  return unwrap(result, "getStandings") as StandingRow[];
}

/** Bracket matches: everything in an elimination stage. */
export async function getBracket(slug: string): Promise<MatchDetails[]> {
  "use cache";
  cacheTag(tags.matches(slug));
  cacheLife("minutes");

  const tournament = await getTournament(slug);
  if (!tournament) return [];

  const result = await readClient()
    .from("match_details")
    .select(MATCH_COLUMNS)
    .eq("tournament_id", tournament.id)
    .in("stage_kind", ["single_elim", "double_elim"])
    .order("stage_order")
    .order("round")
    .order("position");

  return unwrap(result, "getBracket") as MatchDetails[];
}

export type MatchPage = {
  match: MatchDetails;
  games: Game[];
  picks: GamePick[];
  bans: GameBan[];
  rosters: { team1: Player[]; team2: Player[] };
};

export async function getMatchPage(matchId: number): Promise<MatchPage | null> {
  "use cache";
  cacheTag(tags.match(matchId));
  cacheLife("minutes");

  if (!isSupabaseConfigured()) return null;

  const client = readClient();

  const { data: match, error } = await client
    .from("match_details")
    .select(MATCH_COLUMNS)
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw new Error(`getMatchPage: ${describeError(error.message)}`);
  if (!match) return null;

  const typed = match as MatchDetails;

  const gamesResult = await client
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .order("game_number");

  const games = unwrap(gamesResult, "getMatchPage.games") as Game[];
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
    picks: unwrap(picks, "getMatchPage.picks") as GamePick[],
    bans: unwrap(bans, "getMatchPage.bans") as GameBan[],
    rosters: {
      team1: unwrap(roster1, "getMatchPage.roster1") as Player[],
      team2: unwrap(roster2, "getMatchPage.roster2") as Player[],
    },
  };
}

export type ResultsPage = {
  placements: (Placement & { team_name: string | null; team_slug: string | null })[];
  awards: Award[];
};

export async function getResults(slug: string): Promise<ResultsPage> {
  "use cache";
  cacheTag(tags.results(slug));
  cacheLife("hours");

  const tournament = await getTournament(slug);
  if (!tournament) return { placements: [], awards: [] };

  const client = readClient();

  const [placements, awards, teams] = await Promise.all([
    client
      .from("placements")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("place"),
    client
      .from("awards")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("sort_order"),
    client.from("teams").select("id, name, slug").eq("tournament_id", tournament.id),
  ]);

  const teamRows = unwrap(teams, "getResults.teams") as Pick<
    Team,
    "id" | "name" | "slug"
  >[];
  const byId = new Map(teamRows.map((team) => [team.id, team]));

  return {
    placements: (unwrap(placements, "getResults.placements") as Placement[]).map(
      (placement) => {
        const team = placement.team_id ? byId.get(placement.team_id) : undefined;
        return {
          ...placement,
          team_name: team?.name ?? placement.team_label,
          team_slug: team?.slug ?? null,
        };
      },
    ),
    awards: unwrap(awards, "getResults.awards") as Award[],
  };
}

export type Highlights = {
  live: MatchDetails[];
  upcoming: MatchDetails[];
  recent: MatchDetails[];
};

/**
 * Home page blocks. Short cache life because this is what viewers stare at
 * during a tournament day; admin writes invalidate it immediately anyway.
 */
export async function getHighlights(slug: string): Promise<Highlights> {
  "use cache";
  cacheTag(tags.matches(slug));
  cacheLife("minutes");

  const tournament = await getTournament(slug);
  if (!tournament) return { live: [], upcoming: [], recent: [] };

  const client = readClient();

  const [live, upcoming, recent] = await Promise.all([
    client
      .from("match_details")
      .select(MATCH_COLUMNS)
      .eq("tournament_id", tournament.id)
      .eq("status", "live")
      .order("is_featured", { ascending: false })
      .order("scheduled_at", { nullsFirst: false }),
    client
      .from("match_details")
      .select(MATCH_COLUMNS)
      .eq("tournament_id", tournament.id)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(6),
    client
      .from("match_details")
      .select(MATCH_COLUMNS)
      .eq("tournament_id", tournament.id)
      .eq("status", "finished")
      .order("finished_at", { ascending: false, nullsFirst: false })
      .limit(6),
  ]);

  return {
    live: unwrap(live, "getHighlights.live") as MatchDetails[],
    upcoming: unwrap(upcoming, "getHighlights.upcoming") as MatchDetails[],
    recent: unwrap(recent, "getHighlights.recent") as MatchDetails[],
  };
}
