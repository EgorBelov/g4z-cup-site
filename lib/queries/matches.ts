import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getLiveMatch(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "live")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading live match:", error);
    throw new Error("Не удалось загрузить live матч");
  }

  return data;
}

export async function getUpcomingMatches(tournamentId: number, limit = 5) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "upcoming")
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error loading upcoming matches:", error);
    throw new Error("Не удалось загрузить ближайшие матчи");
  }

  return data ?? [];
}

export async function getLatestResults(tournamentId: number, limit = 5) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "finished")
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error loading latest results:", error);
    throw new Error("Не удалось загрузить последние результаты");
  }

  return data ?? [];
}

export async function getScheduleMatches(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("scheduled_at", { ascending: true })
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading schedule matches:", error);
    throw new Error("Не удалось загрузить расписание");
  }

  return data ?? [];
}

export async function getPlayoffMatches(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "playoff")
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading playoff matches:", error);
    throw new Error("Не удалось загрузить плей-офф");
  }

  return data ?? [];
}
