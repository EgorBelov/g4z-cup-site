import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { requirePlayer, applicationMembers } from "@/lib/queries/player";
import { writeClient } from "@/lib/supabase/write";
import type { CommunityTeam, RegistrationTeam } from "@/lib/types/registration";
import type { Tournament } from "@/lib/types/database";

export async function applicationDetail(id: number, admin = false) {
  if (admin) await requireAdmin();
  const player = admin ? null : await requirePlayer();
  const client = writeClient();
  const { data: application, error } = await client
    .from("registration_teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить заявку");
  if (!application) notFound();
  const { data: team, error: teamError } = await client
    .from("community_teams")
    .select("*")
    .eq("id", application.community_team_id)
    .single();
  if (teamError) throw new Error("Не удалось загрузить команду");
  const captain = Boolean(
    player && (team.main_captain === player.id || team.second_captain === player.id),
  );
  let members = await applicationMembers(id);
  if (!admin && !captain && !members.some((m) => m.profile_id === player!.id))
    notFound();
  const { data: tournament, error: cupError } = await client
    .from("tournaments")
    .select("*")
    .eq("id", application.tournament_id)
    .single();
  if (cupError || (!admin && tournament?.status === "draft")) notFound();
  if (application.status === "accepted" && application.snapshot_team_id) {
    const snapshot = await client
      .from("players")
      .select("profile_id,nickname,mmr,elo")
      .eq("team_id", application.snapshot_team_id);
    if (snapshot.error) throw new Error("Не удалось загрузить принятый состав");
    members = members.map((m) => {
      const p = snapshot.data.find((p) => p.profile_id === m.profile_id);
      return p
        ? {
            ...m,
            nickname: p.nickname as string,
            dota_mmr: p.mmr as number | null,
            cs_elo: p.elo as number | null,
          }
        : m;
    });
  }
  const invites =
    captain || admin
      ? await client
          .from("team_invites")
          .select("id,registration_team_id,recipient_id,status,expires_at")
          .eq("registration_team_id", id)
          .eq("status", "active")
      : null;
  const events = await client
    .from("registration_events")
    .select("id,action,reason,actor_kind,created_at")
    .eq("registration_team_id", id)
    .order("id", { ascending: false })
    .limit(20);
  if (invites?.error || events.error)
    throw new Error("Не удалось загрузить историю заявки");
  return {
    application: application as RegistrationTeam,
    team: team as CommunityTeam,
    tournament: tournament as Tournament,
    members,
    player,
    captain,
    invites: invites?.data ?? [],
    events: events.data,
  };
}
export async function managedTeam(id: number) {
  const player = await requirePlayer();
  const client = writeClient();
  const { data, error } = await client
    .from("community_teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить команду");
  if (!data || (data.main_captain !== player.id && data.second_captain !== player.id))
    notFound();
  const applications = await client
    .from("registration_teams")
    .select("*")
    .eq("community_team_id", id)
    .order("id", { ascending: false });
  const requests = await client
    .from("captain_requests")
    .select("*")
    .eq("community_team_id", id)
    .eq("status", "pending");
  if (applications.error || requests.error)
    throw new Error("Не удалось загрузить участия команды");
  return {
    player,
    team: data as CommunityTeam,
    applications: applications.data as RegistrationTeam[],
    requests: requests.data,
  };
}
