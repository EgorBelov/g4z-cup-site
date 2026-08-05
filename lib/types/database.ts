/**
 * Database row shapes.
 *
 * Regenerate from the live schema with:
 *   supabase gen types typescript --linked > lib/types/database.generated.ts
 * and keep this file as the hand-curated public surface the app codes against.
 */

export type TournamentStatus = "draft" | "upcoming" | "live" | "finished";
export type StageKind = "round_robin" | "swiss" | "single_elim" | "double_elim";
export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type BracketSide = "upper" | "lower" | "final";

export type Tournament = {
  id: number;
  slug: string;
  name: string;
  edition: number | null;
  game: string;
  status: TournamentStatus;
  is_current: boolean;
  starts_at: string | null;
  ends_at: string | null;
  time_zone: string;
  format_summary: string | null;
  description: string | null;
  prize_pool: string | null;
  stream_url: string | null;
  telegram_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentSummary = Tournament & {
  team_count: number;
  match_count: number;
  champion_name: string | null;
};

export type Stage = {
  id: number;
  tournament_id: number;
  kind: StageKind;
  name: string;
  sort_order: number;
  best_of: number;
  advance_count: number | null;
};

export type Group = {
  id: number;
  tournament_id: number;
  stage_id: number;
  name: string;
  sort_order: number;
};

export type Team = {
  id: number;
  tournament_id: number;
  slug: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  seed: number | null;
  group_id: number | null;
  description: string | null;
};

export type Player = {
  id: number;
  team_id: number;
  nickname: string;
  real_name: string | null;
  role: string | null;
  is_captain: boolean;
  is_standin: boolean;
  steam_url: string | null;
  dotabuff_url: string | null;
  sort_order: number;
  mmr: number | null;
};

export type Match = {
  id: number;
  tournament_id: number;
  stage_id: number;
  group_id: number | null;
  round: number;
  round_label: string | null;
  bracket: BracketSide | null;
  position: number;
  best_of: number;
  team1_id: number | null;
  team2_id: number | null;
  team1_source: string | null;
  team2_source: string | null;
  score1: number;
  score2: number;
  winner_id: number | null;
  loser_id: number | null;
  status: MatchStatus;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  stream_url: string | null;
  vod_url: string | null;
  notes: string | null;
  is_featured: boolean;
  winner_to_match_id: number | null;
  winner_to_slot: number | null;
  loser_to_match_id: number | null;
  loser_to_slot: number | null;
};

/** `match_details` view: match plus the names every screen needs. */
export type MatchDetails = {
  id: number;
  tournament_id: number;
  tournament_slug: string;
  stage_id: number;
  stage_name: string;
  stage_kind: StageKind;
  stage_order: number;
  group_id: number | null;
  group_name: string | null;
  round: number;
  round_label: string | null;
  bracket: BracketSide | null;
  position: number;
  best_of: number;
  team1_id: number | null;
  team1_name: string | null;
  team1_slug: string | null;
  team1_tag: string | null;
  team1_logo: string | null;
  team1_source: string | null;
  team2_id: number | null;
  team2_name: string | null;
  team2_slug: string | null;
  team2_tag: string | null;
  team2_logo: string | null;
  team2_source: string | null;
  score1: number;
  score2: number;
  winner_id: number | null;
  winner_name: string | null;
  winner_slug: string | null;
  loser_id: number | null;
  status: MatchStatus;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  stream_url: string | null;
  vod_url: string | null;
  notes: string | null;
  is_featured: boolean;
  winner_to_match_id: number | null;
  loser_to_match_id: number | null;
  games_count: number;
};

export type StandingRow = {
  tournament_id: number;
  stage_id: number;
  stage_name: string;
  group_id: number;
  group_name: string;
  group_order: number;
  team_id: number;
  team_name: string;
  team_slug: string;
  team_tag: string | null;
  team_logo: string | null;
  seed: number | null;
  advance_count: number | null;
  played: number;
  wins: number;
  losses: number;
  maps_won: number;
  maps_lost: number;
  map_diff: number;
  /** Only an even series (bo2) can end level. */
  draws: number;
  /** 2 per win, 1 per draw — for a bo2 stage that is one point per map won. */
  points: number;
};

export type Game = {
  id: number;
  match_id: number;
  game_number: number;
  winner_id: number | null;
  radiant_team_id: number | null;
  first_pick_team_id: number | null;
  duration_seconds: number | null;
  dota_match_id: number | null;
  notes: string | null;
};

export type GamePick = {
  id: number;
  game_id: number;
  team_id: number;
  hero: string;
  player_id: number | null;
  player_name: string | null;
  order_no: number;
};

export type GameBan = {
  id: number;
  game_id: number;
  team_id: number;
  hero: string;
  order_no: number;
};

export type Placement = {
  id: number;
  tournament_id: number;
  place: number;
  team_id: number | null;
  team_label: string | null;
  prize: string | null;
  note: string | null;
};

export type Award = {
  id: number;
  tournament_id: number;
  title: string;
  player_id: number | null;
  nickname: string | null;
  team_id: number | null;
  team_label: string | null;
  note: string | null;
  sort_order: number;
};

export type Hero = {
  id: number;
  slug: string;
  name: string;
};

export type AuditEntry = {
  id: number;
  at: string;
  action: string;
  entity: string;
  entity_id: number | null;
  summary: string | null;
  payload: unknown;
  ip: string | null;
};
