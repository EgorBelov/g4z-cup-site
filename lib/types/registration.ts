export type Discipline = "dota2" | "cs2" | "other";
export type Profile = {
  id: string;
  code: number;
  telegram_id: string;
  nickname: string;
  telegram_username: string;
  telegram_contact_verified: boolean;
  steam_url: string;
  faceit_url: string | null;
  dotabuff_url: string | null;
  version: number;
};
export type ProfileWithRatings = Profile & {
  dota_mmr: number | null;
  cs_elo: number | null;
};
export type PublicRegistrant = {
  id: string;
  code: number;
  nickname: string;
  dota_mmr: number | null;
  cs_elo: number | null;
};
export type CommunityTeam = {
  id: number;
  slug: string;
  name: string;
  tag: string | null;
  description: string | null;
  main_captain: string;
  second_captain: string | null;
  archived: boolean;
  version: number;
};
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";
export type RegistrationTeam = {
  id: number;
  tournament_id: number;
  community_team_id: number;
  status: ApplicationStatus;
  version: number;
  reason: string | null;
  snapshot_team_id: number | null;
};
export type Member = {
  id: number;
  registration_team_id: number;
  profile_id: string;
  slot: "main" | "substitute";
  active: boolean;
} & Omit<PublicRegistrant, "id">;
export type Invitation = {
  id: number;
  registration_team_id: number;
  recipient_id: string | null;
  status: string;
  expires_at: string;
};
export type CaptainRequest = {
  id: number;
  community_team_id: number;
  recipient_id: string;
  role: "main" | "second";
  status: string;
  expires_at: string;
};
export const applicationLabels: Record<ApplicationStatus, string> = {
  draft: "Черновик",
  submitted: "На проверке",
  accepted: "Принята",
  rejected: "Отклонена",
  waitlisted: "Лист ожидания",
  withdrawn: "Отозвана",
};
