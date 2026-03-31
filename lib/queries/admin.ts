import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminMatches(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("scheduled_at", { ascending: true })
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading admin matches:", error);
    throw new Error("Не удалось загрузить матчи для админки");
  }

  return data ?? [];
}

export async function getAdminMatchById(matchId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("Error loading admin match by id:", error);
    throw new Error("Не удалось загрузить матч");
  }

  return data;
}

export async function getAdminMatchGames(matchId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("match_games")
    .select("*")
    .eq("match_id", matchId)
    .order("game_number", { ascending: true });

  if (error) {
    console.error("Error loading admin match games:", error);
    throw new Error("Не удалось загрузить игры матча");
  }

  return data ?? [];
}

export async function getAdminMatchGameById(gameId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("match_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) {
    console.error("Error loading admin match game by id:", error);
    throw new Error("Не удалось загрузить игру матча");
  }

  return data;
}

export async function getAdminMatchGamePicks(gameId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("match_game_picks")
    .select("*")
    .eq("match_game_id", gameId)
    .order("team_id", { ascending: true })
    .order("pick_order", { ascending: true });

  if (error) {
    console.error("Error loading admin match game picks:", error);
    throw new Error("Не удалось загрузить пики");
  }

  return data ?? [];
}

export async function getAdminMatchGameBans(gameId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("match_game_bans")
    .select("*")
    .eq("match_game_id", gameId)
    .order("team_id", { ascending: true })
    .order("ban_order", { ascending: true });

  if (error) {
    console.error("Error loading admin match game bans:", error);
    throw new Error("Не удалось загрузить баны");
  }

  return data ?? [];
}

export async function getAdminTeams(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("group_name", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading admin teams:", error);
    throw new Error("Не удалось загрузить команды");
  }

  return data ?? [];
}

export async function getAdminTeamById(teamId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Error loading admin team by id:", error);
    throw new Error("Не удалось загрузить команду");
  }

  return data;
}

export async function getAdminGroups(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading admin groups:", error);
    throw new Error("Не удалось загрузить группы");
  }

  return data ?? [];
}

export async function getAdminPlayersByTeamId(teamId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading admin players by team id:", error);
    throw new Error("Не удалось загрузить игроков");
  }

  return data ?? [];
}

export async function getAdminPlayoffMatches(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches_full")
    .select("*")
    .eq("tournament_id", tournamentId)
    .in("stage", ["play_in", "playoff"])
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error loading playoff matches for admin:", error);
    throw new Error("Не удалось загрузить матчи Play-In и плей-офф");
  }

  return data ?? [];
}

export async function getAdminGroupsWithTeams(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      *,
      teams (
        id,
        name,
        slug
      )
    `,
    )
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading groups with teams:", error);
    throw new Error("Не удалось загрузить группы");
  }

  return data ?? [];
}

export async function getAdminDashboardStats(tournamentId: number) {
  const supabase = getSupabaseServerClient();

  const [teamsRes, matchesRes, liveRes, finishedRes, upcomingRes] =
    await Promise.all([
      supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .eq("status", "live"),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .eq("status", "finished"),
      supabase
        .from("matches_full")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "upcoming")
        .order("scheduled_at", { ascending: true })
        .limit(5),
    ]);

  if (teamsRes.error) throw new Error("Не удалось загрузить количество команд");
  if (matchesRes.error)
    throw new Error("Не удалось загрузить количество матчей");
  if (liveRes.error) throw new Error("Не удалось загрузить live матчи");
  if (finishedRes.error)
    throw new Error("Не удалось загрузить завершенные матчи");
  if (upcomingRes.error)
    throw new Error("Не удалось загрузить ближайшие матчи");

  return {
    teamsCount: teamsRes.count ?? 0,
    matchesCount: matchesRes.count ?? 0,
    liveCount: liveRes.count ?? 0,
    finishedCount: finishedRes.count ?? 0,
    upcomingMatches: upcomingRes.data ?? [],
  };
}
