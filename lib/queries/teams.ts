import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getTeams(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("group_name", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading teams:", error);
    throw new Error("Не удалось загрузить команды");
  }

  return data ?? [];
}

export async function getTeamBySlug(slug: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams_full")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error loading team by slug:", error);
    throw new Error("Не удалось загрузить команду");
  }

  return data;
}

export async function getPlayersByTeamId(teamId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading players:", error);
    throw new Error("Не удалось загрузить игроков команды");
  }

  return data ?? [];
}

export async function getMatchesByTeamId(teamId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order("scheduled_at", { ascending: true })
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading team matches:", error);
    throw new Error("Не удалось загрузить матчи команды");
  }

  return data ?? [];
}