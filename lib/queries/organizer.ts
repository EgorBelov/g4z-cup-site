import "server-only";
import { requireAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import type {
  CommunityTeam,
  RegistrationTeam,
  Profile,
  ProfileWithRatings,
} from "@/lib/types/registration";

export async function organizerApplications(tournamentId?: number) {
  await requireAdmin();
  const client = writeClient();
  let query = client
    .from("registration_teams")
    .select("*")
    .order("id", { ascending: false });
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  const result = await query;
  if (result.error) throw new Error("Не удалось загрузить заявки");
  const ids = [...new Set(result.data.map((r) => r.community_team_id as number))];
  const teams = ids.length
    ? await client.from("community_teams").select("*").in("id", ids)
    : { data: [], error: null };
  if (teams.error) throw new Error("Не удалось загрузить команды");
  return {
    applications: result.data as RegistrationTeam[],
    teams: teams.data as CommunityTeam[],
  };
}
export async function organizerPlayers({
  tournamentId,
  after = 0,
  query = "",
}: { tournamentId?: number; after?: number; query?: string } = {}) {
  await requireAdmin();
  const client = writeClient();
  const interests = tournamentId
    ? await client
        .from("participation_interests")
        .select("profile_id")
        .eq("tournament_id", tournamentId)
        .eq("active", true)
    : null;
  if (interests?.error) throw new Error("Не удалось загрузить пожелания игроков");
  const memberships = tournamentId
    ? await client
        .from("team_members")
        .select("profile_id,registration_team_id")
        .eq("tournament_id", tournamentId)
        .eq("active", true)
    : null;
  if (memberships?.error) throw new Error("Не удалось загрузить составы");
  const available = interests?.data
    .filter((i) => !memberships?.data.some((m) => m.profile_id === i.profile_id))
    .map((i) => i.profile_id as string);
  if (available && available.length === 0)
    return { players: [] as Profile[], next: null as number | null };
  let request = client
    .from("player_profiles")
    .select("*")
    .gt("code", after)
    .order("code")
    .limit(101);
  if (available) request = request.in("id", available);
  if (query)
    request = request.ilike("nickname", `%${query.replace(/[%_\\]/g, "\\$&")}%`);
  const result = await request;
  if (result.error) throw new Error("Не удалось загрузить игроков");
  return {
    players: result.data.slice(0, 100) as Profile[],
    next: result.data.length > 100 ? (result.data[99]?.code as number) : null,
  };
}
export async function organizerProfile(
  id: string,
): Promise<{ profile: ProfileWithRatings; duplicateSteam: boolean } | null> {
  await requireAdmin();
  const client = writeClient();
  const { data, error } = await client
    .from("player_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль");
  if (!data) return null;
  const [ratings, duplicates] = await Promise.all([
    client.from("player_ratings").select("discipline,value").eq("profile_id", id),
    client
      .from("player_profiles")
      .select("id")
      .eq("steam_url", data.steam_url)
      .neq("id", id)
      .limit(1),
  ]);
  if (ratings.error || duplicates.error)
    throw new Error("Не удалось проверить профиль");
  return {
    profile: {
      ...(data as Profile),
      dota_mmr: ratings.data.find((r) => r.discipline === "dota2")?.value ?? null,
      cs_elo: ratings.data.find((r) => r.discipline === "cs2")?.value ?? null,
    },
    duplicateSteam: duplicates.data.length > 0,
  };
}
