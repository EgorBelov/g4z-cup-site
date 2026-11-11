import "server-only";
import { redirect } from "next/navigation";
import { verifiedTelegramSession } from "@/lib/auth/player";
import { writeClient } from "@/lib/supabase/write";
import type {
  Profile,
  ProfileWithRatings,
  CommunityTeam,
  RegistrationTeam,
  Member,
  Invitation,
  CaptainRequest,
} from "@/lib/types/registration";

// Deliberately uncached. These results are scoped to the verified current user.
export async function currentPlayer(): Promise<ProfileWithRatings | null> {
  const session = await verifiedTelegramSession();
  if (!session) return null;
  const client = writeClient();
  const { data, error } = await client
    .from("player_profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль игрока");
  if (!data) return null;
  const ratings = await client
    .from("player_ratings")
    .select("discipline,value")
    .eq("profile_id", session.user.id);
  if (ratings.error) throw new Error("Не удалось загрузить показатели");
  return {
    ...(data as Profile),
    dota_mmr: ratings.data.find((r) => r.discipline === "dota2")?.value ?? null,
    cs_elo: ratings.data.find((r) => r.discipline === "cs2")?.value ?? null,
  };
}
export async function requirePlayer() {
  const player = await currentPlayer();
  if (!player) redirect("/login?next=/me");
  return player;
}
export async function playerTeams(profileId: string): Promise<CommunityTeam[]> {
  const { data, error } = await writeClient()
    .from("community_teams")
    .select("*")
    .or(`main_captain.eq.${profileId},second_captain.eq.${profileId}`)
    .order("id", { ascending: false });
  if (error) throw new Error("Не удалось загрузить команды");
  return data as CommunityTeam[];
}
export async function playerApplications(
  profileId: string,
  teams: CommunityTeam[],
): Promise<RegistrationTeam[]> {
  const client = writeClient();
  const members = await client
    .from("team_members")
    .select("registration_team_id")
    .eq("profile_id", profileId)
    .eq("active", true);
  if (members.error) throw new Error("Не удалось загрузить участия");
  const ids = members.data.map((m) => m.registration_team_id as number);
  const filters = [
    ids.length ? `id.in.(${ids.join(",")})` : null,
    teams.length ? `community_team_id.in.(${teams.map((t) => t.id).join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",");
  if (!filters) return [];
  const result = await client
    .from("registration_teams")
    .select("*")
    .or(filters)
    .order("id", { ascending: false });
  if (result.error) throw new Error("Не удалось загрузить заявки");
  return result.data as RegistrationTeam[];
}
export async function applicationMembers(applicationId: number): Promise<Member[]> {
  const client = writeClient();
  const { data, error } = await client
    .from("team_members")
    .select("id,registration_team_id,profile_id,slot,active")
    .eq("registration_team_id", applicationId)
    .eq("active", true)
    .order("id");
  if (error) throw new Error("Не удалось загрузить состав");
  if (!data.length) return [];
  const ids = data.map((m) => m.profile_id as string);
  const [profiles, ratings] = await Promise.all([
    client.from("player_profiles").select("id,code,nickname").in("id", ids),
    client
      .from("player_ratings")
      .select("profile_id,discipline,value")
      .in("profile_id", ids),
  ]);
  if (profiles.error || ratings.error) throw new Error("Не удалось загрузить игроков");
  return data.map((m) => {
    const p = profiles.data.find((p) => p.id === m.profile_id)!;
    return {
      ...m,
      code: p.code,
      nickname: p.nickname,
      dota_mmr:
        ratings.data.find((r) => r.profile_id === p.id && r.discipline === "dota2")
          ?.value ?? null,
      cs_elo:
        ratings.data.find((r) => r.profile_id === p.id && r.discipline === "cs2")
          ?.value ?? null,
    } as Member;
  });
}
export async function incomingInvites(profileId: string) {
  const client = writeClient();
  const [invites, requests] = await Promise.all([
    client
      .from("team_invites")
      .select("id,registration_team_id,recipient_id,status,expires_at")
      .eq("recipient_id", profileId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
    client
      .from("captain_requests")
      .select("*")
      .eq("recipient_id", profileId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);
  if (invites.error || requests.error)
    throw new Error("Не удалось загрузить приглашения");
  return {
    invites: invites.data as Invitation[],
    requests: requests.data as CaptainRequest[],
  };
}
export async function invitePreview(tokenHash: string) {
  const client = writeClient();
  const { data: invite, error } = await client
    .from("team_invites")
    .select("id,registration_team_id,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error("Не удалось проверить приглашение");
  if (!invite) return null;
  const { data: application, error: appError } = await client
    .from("registration_teams")
    .select("*")
    .eq("id", invite.registration_team_id)
    .single();
  if (appError) throw new Error("Не удалось проверить заявку");
  const { data: team, error: teamError } = await client
    .from("community_teams")
    .select("id,slug,name,archived")
    .eq("id", application.community_team_id)
    .single();
  if (teamError) throw new Error("Не удалось проверить команду");
  return {
    invite: invite as Invitation,
    expired: new Date(invite.expires_at as string).getTime() <= Date.now(),
    application: application as RegistrationTeam,
    team: team as Pick<CommunityTeam, "id" | "slug" | "name" | "archived">,
  };
}
