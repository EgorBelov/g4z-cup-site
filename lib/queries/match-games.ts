import { getSupabaseServerClient } from "@/lib/supabase/server";

const MATCH_FIELDS = `
  id,
  stage,
  group_name,
  round_name,
  team1_id,
  team1_name,
  team2_id,
  team2_name,
  score1,
  score2,
  status,
  bo,
  scheduled_at,
  stream_url
`;

const MATCH_GAME_FIELDS = `
  id,
  match_id,
  game_number,
  winner_id,
  duration_minutes,
  notes
`;

const PICK_FIELDS = `
  id,
  match_game_id,
  team_id,
  player_name,
  hero_name,
  pick_order
`;

const BAN_FIELDS = `
  id,
  match_game_id,
  team_id,
  hero_name,
  ban_order
`;

export type MatchData = {
  id: number;
  stage: string;
  group_name: string | null;
  round_name: string;
  team1_id: number | null;
  team1_name: string | null;
  team2_id: number | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  bo: string;
  scheduled_at: string | null;
  stream_url: string | null;
};

export type MatchGame = {
  id: number;
  match_id: number;
  game_number: number;
  winner_id: number | null;
  duration_minutes: number | null;
  notes: string | null;
};

export type PickRow = {
  id: number;
  match_game_id: number;
  team_id: number;
  player_name: string;
  hero_name: string;
  pick_order: number;
};

export type BanRow = {
  id: number;
  match_game_id: number;
  team_id: number;
  hero_name: string;
  ban_order: number;
};

export type MatchPageData = {
  match: MatchData | null;
  games: MatchGame[];
  picks: PickRow[];
  bans: BanRow[];
};

export async function getMatchPageData(
  matchId: number
): Promise<MatchPageData> {
  const supabase = getSupabaseServerClient();

  const [matchResult, gamesResult] = await Promise.all([
    supabase
      .from("matches_full")
      .select(MATCH_FIELDS)
      .eq("id", matchId)
      .maybeSingle(),

    supabase
      .from("match_games")
      .select(MATCH_GAME_FIELDS)
      .eq("match_id", matchId)
      .order("game_number", { ascending: true }),
  ]);

  if (matchResult.error) {
    console.error("Error loading match:", matchResult.error);
    throw new Error("Не удалось загрузить матч");
  }

  if (gamesResult.error) {
    console.error("Error loading match games:", gamesResult.error);
    throw new Error("Не удалось загрузить карты матча");
  }

  const match = matchResult.data;
  const games = gamesResult.data ?? [];

  if (!match) {
    return {
      match: null,
      games: [],
      picks: [],
      bans: [],
    };
  }

  const gameIds = games.map((game) => game.id);

  if (gameIds.length === 0) {
    return {
      match,
      games,
      picks: [],
      bans: [],
    };
  }

  const [picksResult, bansResult] = await Promise.all([
    supabase
      .from("match_game_picks")
      .select(PICK_FIELDS)
      .in("match_game_id", gameIds)
      .order("match_game_id", { ascending: true })
      .order("team_id", { ascending: true })
      .order("pick_order", { ascending: true }),

    supabase
      .from("match_game_bans")
      .select(BAN_FIELDS)
      .in("match_game_id", gameIds)
      .order("match_game_id", { ascending: true })
      .order("team_id", { ascending: true })
      .order("ban_order", { ascending: true }),
  ]);

  if (picksResult.error) {
    console.error("Error loading picks:", picksResult.error);
    throw new Error("Не удалось загрузить пики");
  }

  if (bansResult.error) {
    console.error("Error loading bans:", bansResult.error);
    throw new Error("Не удалось загрузить баны");
  }

  return {
    match,
    games,
    picks: picksResult.data ?? [],
    bans: bansResult.data ?? [],
  };
}