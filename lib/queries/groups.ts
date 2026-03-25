import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getGroupStandings(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("group_standings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("group_id", { ascending: true })
    .order("wins", { ascending: false })
    .order("losses", { ascending: true });

  if (error) {
    console.error("Error loading group standings:", error);
    throw new Error("Не удалось загрузить таблицы групп");
  }

  return data ?? [];
}

export async function getGroupMatches(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "group")
    .order("group_id", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading group matches:", error);
    throw new Error("Не удалось загрузить матчи групп");
  }

  return data ?? [];
}