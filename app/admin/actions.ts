"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function updateMatchAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const id = Number(formData.get("id"));
  const scheduledAtRaw = String(formData.get("scheduled_at") || "").trim();
  const status = String(formData.get("status") || "upcoming");
  const streamUrlRaw = String(formData.get("stream_url") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();

  const scheduled_at = scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null;
  const stream_url = streamUrlRaw || null;
  const notes = notesRaw || null;

  const { error } = await supabase
    .from("matches")
    .update({
      scheduled_at,
      status,
      stream_url,
      notes,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating match:", error);
    throw new Error("Не удалось обновить матч");
  }

  redirect(`/admin/matches/${id}`);
}

export async function createMatchGameAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const matchId = Number(formData.get("match_id"));
  const gameNumber = Number(formData.get("game_number"));

  const { error } = await supabase.from("match_games").insert({
    match_id: matchId,
    game_number: gameNumber,
  });

  if (error) {
    console.error("Error creating match game:", error);
    throw new Error("Не удалось добавить карту");
  }

  redirect(`/admin/matches/${matchId}`);
}

export async function updateMatchGameAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const gameId = Number(formData.get("game_id"));
  const matchId = Number(formData.get("match_id"));
  const winnerIdRaw = String(formData.get("winner_id") || "").trim();
  const durationRaw = String(formData.get("duration_minutes") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();

  const winner_id = winnerIdRaw ? Number(winnerIdRaw) : null;
  const duration_minutes = durationRaw ? Number(durationRaw) : null;
  const notes = notesRaw || null;

  const { error } = await supabase
    .from("match_games")
    .update({
      winner_id,
      duration_minutes,
      notes,
    })
    .eq("id", gameId);

  if (error) {
    console.error("Error updating match game:", error);
    throw new Error("Не удалось обновить карту");
  }

  redirect(`/admin/matches/${matchId}`);
}

export async function deleteMatchGameAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const gameId = Number(formData.get("game_id"));
  const matchId = Number(formData.get("match_id"));

  const { error } = await supabase
    .from("match_games")
    .delete()
    .eq("id", gameId);

  if (error) {
    console.error("Error deleting match game:", error);
    throw new Error("Не удалось удалить карту");
  }

  redirect(`/admin/matches/${matchId}`);
}

export async function updateMatchGameDraftAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const matchId = Number(formData.get("match_id"));
  const gameId = Number(formData.get("game_id"));
  const team1Id = Number(formData.get("team1_id"));
  const team2Id = Number(formData.get("team2_id"));

  const team1Picks = Array.from({ length: 5 }, (_, i) => ({
    player_name: String(formData.get(`team1_pick_player_${i + 1}`) || "").trim(),
    hero_name: String(formData.get(`team1_pick_hero_${i + 1}`) || "").trim(),
    pick_order: i + 1,
  })).filter((row) => row.player_name || row.hero_name);

  const team2Picks = Array.from({ length: 5 }, (_, i) => ({
    player_name: String(formData.get(`team2_pick_player_${i + 1}`) || "").trim(),
    hero_name: String(formData.get(`team2_pick_hero_${i + 1}`) || "").trim(),
    pick_order: i + 1,
  })).filter((row) => row.player_name || row.hero_name);

  const team1Bans = Array.from({ length: 7 }, (_, i) => ({
    hero_name: String(formData.get(`team1_ban_${i + 1}`) || "").trim(),
    ban_order: i + 1,
  })).filter((row) => row.hero_name);

  const team2Bans = Array.from({ length: 7 }, (_, i) => ({
    hero_name: String(formData.get(`team2_ban_${i + 1}`) || "").trim(),
    ban_order: i + 1,
  })).filter((row) => row.hero_name);

  const deletePicks = await supabase
    .from("match_game_picks")
    .delete()
    .eq("match_game_id", gameId);

  if (deletePicks.error) {
    console.error("Error deleting old picks:", deletePicks.error);
    throw new Error("Не удалось обновить пики");
  }

  const deleteBans = await supabase
    .from("match_game_bans")
    .delete()
    .eq("match_game_id", gameId);

  if (deleteBans.error) {
    console.error("Error deleting old bans:", deleteBans.error);
    throw new Error("Не удалось обновить баны");
  }

  const picksToInsert = [
    ...team1Picks.map((row) => ({
      match_game_id: gameId,
      team_id: team1Id,
      player_name: row.player_name,
      hero_name: row.hero_name,
      pick_order: row.pick_order,
    })),
    ...team2Picks.map((row) => ({
      match_game_id: gameId,
      team_id: team2Id,
      player_name: row.player_name,
      hero_name: row.hero_name,
      pick_order: row.pick_order,
    })),
  ];

  const bansToInsert = [
    ...team1Bans.map((row) => ({
      match_game_id: gameId,
      team_id: team1Id,
      hero_name: row.hero_name,
      ban_order: row.ban_order,
    })),
    ...team2Bans.map((row) => ({
      match_game_id: gameId,
      team_id: team2Id,
      hero_name: row.hero_name,
      ban_order: row.ban_order,
    })),
  ];

  if (picksToInsert.length > 0) {
    const insertPicks = await supabase.from("match_game_picks").insert(picksToInsert);

    if (insertPicks.error) {
      console.error("Error inserting picks:", insertPicks.error);
      throw new Error("Не удалось сохранить пики");
    }
  }

  if (bansToInsert.length > 0) {
    const insertBans = await supabase.from("match_game_bans").insert(bansToInsert);

    if (insertBans.error) {
      console.error("Error inserting bans:", insertBans.error);
      throw new Error("Не удалось сохранить баны");
    }
  }

  redirect(`/admin/matches/${matchId}`);
}

export async function updateTeamAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const teamId = Number(formData.get("team_id"));
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const descriptionRaw = String(formData.get("description") || "").trim();
  const groupIdRaw = String(formData.get("group_id") || "").trim();

  const description = descriptionRaw || null;
  const group_id = groupIdRaw ? Number(groupIdRaw) : null;

  const { error } = await supabase
    .from("teams")
    .update({
      name,
      slug,
      description,
      group_id,
    })
    .eq("id", teamId);

  if (error) {
    console.error("Error updating team:", error);
    throw new Error("Не удалось обновить команду");
  }

  redirect(`/admin/teams/${teamId}`);
}

export async function replaceTeamPlayersAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const teamId = Number(formData.get("team_id"));

  const players = Array.from({ length: 5 }, (_, i) => ({
    nickname: String(formData.get(`player_nickname_${i + 1}`) || "").trim(),
    role: String(formData.get(`player_role_${i + 1}`) || "").trim(),
    sort_order: i + 1,
  })).filter((p) => p.nickname);

  const deleteResult = await supabase
    .from("players")
    .delete()
    .eq("team_id", teamId);

  if (deleteResult.error) {
    console.error("Error deleting old players:", deleteResult.error);
    throw new Error("Не удалось обновить состав");
  }

  if (players.length > 0) {
    const insertResult = await supabase.from("players").insert(
      players.map((p) => ({
        team_id: teamId,
        nickname: p.nickname,
        role: p.role || null,
        sort_order: p.sort_order,
      }))
    );

    if (insertResult.error) {
      console.error("Error inserting players:", insertResult.error);
      throw new Error("Не удалось сохранить состав");
    }
  }

  redirect(`/admin/teams/${teamId}`);
}

export async function updatePlayoffMatchSlotsAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const matchId = Number(formData.get("match_id"));
  const team1Raw = String(formData.get("team1_id") || "").trim();
  const team2Raw = String(formData.get("team2_id") || "").trim();
  const scheduledAtRaw = String(formData.get("scheduled_at") || "").trim();
  const streamUrlRaw = String(formData.get("stream_url") || "").trim();

  const team1_id = team1Raw ? Number(team1Raw) : null;
  const team2_id = team2Raw ? Number(team2Raw) : null;
  const scheduled_at = scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null;
  const stream_url = streamUrlRaw || null;

  const { error } = await supabase
    .from("matches")
    .update({
      team1_id,
      team2_id,
      scheduled_at,
      stream_url,
    })
    .eq("id", matchId);

    if (error) {
    console.error("Error updating playoff/play-in slots:", error);
    throw new Error("Не удалось обновить слот матча");
  }

  redirect("/admin/playoff");

}

export async function createTeamAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const tournamentId = Number(formData.get("tournament_id"));
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const groupIdRaw = String(formData.get("group_id") || "").trim();
  const descriptionRaw = String(formData.get("description") || "").trim();

  const group_id = groupIdRaw ? Number(groupIdRaw) : null;
  const description = descriptionRaw || null;

  const { error } = await supabase.from("teams").insert({
    tournament_id: tournamentId,
    name,
    slug,
    group_id,
    description,
  });

  if (error) {
    console.error("Error creating team:", error);
    throw new Error("Не удалось создать команду");
  }

  redirect("/admin/teams");
}

export async function createMatchAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const tournamentId = Number(formData.get("tournament_id"));
  const stage = String(formData.get("stage") || "group").trim();
  const roundName = String(formData.get("round_name") || "").trim();
  const groupIdRaw = String(formData.get("group_id") || "").trim();
  const team1Raw = String(formData.get("team1_id") || "").trim();
  const team2Raw = String(formData.get("team2_id") || "").trim();
  const bo = String(formData.get("bo") || "bo1").trim();
  const scheduledAtRaw = String(formData.get("scheduled_at") || "").trim();
  const streamUrlRaw = String(formData.get("stream_url") || "").trim();
  const matchOrderRaw = String(formData.get("match_order") || "").trim();

  const group_id = groupIdRaw ? Number(groupIdRaw) : null;
  const team1_id = team1Raw ? Number(team1Raw) : null;
  const team2_id = team2Raw ? Number(team2Raw) : null;
  const scheduled_at = scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null;
  const stream_url = streamUrlRaw || null;
  const match_order = matchOrderRaw ? Number(matchOrderRaw) : 0;

  const { error } = await supabase.from("matches").insert({
    tournament_id: tournamentId,
    stage,
    round_name: roundName,
    group_id,
    team1_id,
    team2_id,
    bo,
    scheduled_at,
    stream_url,
    match_order,
    status: "upcoming",
  });

  if (error) {
    console.error("Error creating match:", error);
    throw new Error("Не удалось создать матч");
  }

  redirect("/admin");
}

export async function createGroupAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const tournamentId = Number(formData.get("tournament_id"));
  const name = String(formData.get("name") || "").trim();
  const sortOrderRaw = String(formData.get("sort_order") || "").trim();

  const sort_order = sortOrderRaw ? Number(sortOrderRaw) : 0;

  const { error } = await supabase.from("groups").insert({
    tournament_id: tournamentId,
    name,
    sort_order,
  });

  if (error) {
    console.error("Error creating group:", error);
    throw new Error("Не удалось создать группу");
  }

  redirect("/admin/groups");
}

export async function updateGroupAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const groupId = Number(formData.get("group_id"));
  const name = String(formData.get("name") || "").trim();
  const sortOrderRaw = String(formData.get("sort_order") || "").trim();

  const sort_order = sortOrderRaw ? Number(sortOrderRaw) : 0;

  const { error } = await supabase
    .from("groups")
    .update({
      name,
      sort_order,
    })
    .eq("id", groupId);

  if (error) {
    console.error("Error updating group:", error);
    throw new Error("Не удалось обновить группу");
  }

  redirect("/admin/groups");
}

export async function deleteGroupAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const groupId = Number(formData.get("group_id"));

  const clearTeamsResult = await supabase
    .from("teams")
    .update({ group_id: null })
    .eq("group_id", groupId);

  if (clearTeamsResult.error) {
    console.error("Error clearing teams group:", clearTeamsResult.error);
    throw new Error("Не удалось отвязать команды от группы");
  }

  const deleteResult = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteResult.error) {
    console.error("Error deleting group:", deleteResult.error);
    throw new Error("Не удалось удалить группу");
  }

  redirect("/admin/groups");
}