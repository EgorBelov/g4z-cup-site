import { z } from "zod";

/**
 * Input schemas for every mutation.
 *
 * Form fields arrive as strings, so numbers and booleans are coerced here and
 * empty strings become `null` instead of `0` or `""` sneaking into the database.
 */

const trimmed = z.string().trim();

const optionalText = trimmed
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const optionalUrl = trimmed
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional()
  .refine(
    (value) => value === null || value === undefined || /^https?:\/\//.test(value),
    { error: "Ссылка должна начинаться с http:// или https://" },
  )
  .transform((value) => value ?? null);

const optionalId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

const optionalInt = z
  .union([z.literal(""), z.coerce.number().int()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");

const slug = trimmed
  .min(2, { error: "Слаг слишком короткий" })
  .max(60, { error: "Слаг слишком длинный" })
  .regex(/^[a-z0-9][a-z0-9-]*$/, {
    error: "Только латиница в нижнем регистре, цифры и дефис",
  });

const bestOf = z.coerce
  .number()
  .int()
  .refine((value) => [1, 3, 5, 7].includes(value), {
    error: "Формат серии: 1, 3, 5 или 7",
  });

// ─── auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  password: z.string().min(1, { error: "Введите пароль" }),
  redirectTo: optionalText,
});

// ─── tournaments ─────────────────────────────────────────────────────────────

export const tournamentSchema = z.object({
  slug,
  name: trimmed.min(2, { error: "Укажите название" }),
  edition: optionalInt,
  status: z.enum(["draft", "upcoming", "live", "finished"]),
  starts_at: optionalText,
  ends_at: optionalText,
  time_zone: trimmed.min(1).default("Europe/Moscow"),
  format_summary: optionalText,
  description: optionalText,
  prize_pool: optionalText,
  stream_url: optionalUrl,
  telegram_url: optionalUrl,
  logo_url: optionalUrl,
});

export const tournamentIdSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
});

// ─── teams and players ───────────────────────────────────────────────────────

export const teamSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  team_id: optionalId,
  name: trimmed.min(2, { error: "Укажите название команды" }),
  slug: z.union([z.literal(""), slug]).optional(),
  tag: optionalText,
  seed: optionalInt,
  group_id: optionalId,
  description: optionalText,
  logo_url: optionalUrl,
});

export const rosterSchema = z.object({
  team_id: z.coerce.number().int().positive(),
  nickname: z.union([z.string(), z.array(z.string())]).transform(toArray),
  real_name: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray),
  role: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray),
  captain: optionalInt,
});

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ─── stages, groups, generation ──────────────────────────────────────────────

export const stageSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: optionalId,
  kind: z.enum(["round_robin", "swiss", "single_elim", "double_elim"]),
  name: trimmed.min(2, { error: "Укажите название этапа" }),
  sort_order: z.coerce.number().int().min(0).default(0),
  best_of: bestOf,
  advance_count: optionalInt,
});

export const groupSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: z.coerce.number().int().positive(),
  group_id: optionalId,
  name: trimmed.min(1, { error: "Укажите название группы" }),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const assignGroupSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  team_id: z.coerce.number().int().positive(),
  group_id: optionalId,
});

export const generateStageSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: z.coerce.number().int().positive(),
  group_id: optionalId,
  best_of: bestOf,
  final_best_of: z
    .union([z.literal(""), bestOf])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  third_place: checkbox,
  start_at: optionalText,
  round_gap_minutes: z.coerce.number().int().min(0).max(1440).default(60),
  replace_existing: checkbox,
  /** Where the entrants come from: manual seeds or the group standings. */
  entrant_source: z.enum(["seed", "standings"]).default("seed"),
  entrant_limit: optionalInt,
});

export const autoSeedSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: z.coerce.number().int().positive(),
});

export const swissRoundSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: z.coerce.number().int().positive(),
  group_id: z.coerce.number().int().positive(),
  best_of: bestOf,
  start_at: optionalText,
});

// ─── matches ─────────────────────────────────────────────────────────────────

export const matchSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  match_id: optionalId,
  stage_id: z.coerce.number().int().positive(),
  group_id: optionalId,
  round: z.coerce.number().int().min(1).default(1),
  round_label: optionalText,
  position: z.coerce.number().int().min(1).default(1),
  best_of: bestOf,
  team1_id: optionalId,
  team2_id: optionalId,
  team1_source: optionalText,
  team2_source: optionalText,
  scheduled_at: optionalText,
  stream_url: optionalUrl,
  vod_url: optionalUrl,
  notes: optionalText,
  is_featured: checkbox,
});

export const matchIdSchema = z.object({
  match_id: z.coerce.number().int().positive(),
});

export const matchStatusSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  status: z.enum(["scheduled", "live", "finished", "cancelled"]),
});

export const shiftScheduleSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: optionalId,
  minutes: z.coerce.number().int().min(-720).max(720),
  only_unplayed: checkbox,
});

// ─── games and drafts ────────────────────────────────────────────────────────

export const gameSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  game_id: optionalId,
  winner_id: optionalId,
  radiant_team_id: optionalId,
  first_pick_team_id: optionalId,
  duration_minutes: optionalInt,
  dota_match_id: optionalInt,
  notes: optionalText,
});

export const gameIdSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  game_id: z.coerce.number().int().positive(),
});

export const quickWinnerSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  winner_id: z.coerce.number().int().positive(),
});

const draftLine = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform(toArray);

export const draftSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  game_id: z.coerce.number().int().positive(),
  team1_id: z.coerce.number().int().positive(),
  team2_id: z.coerce.number().int().positive(),
  team1_pick_hero: draftLine,
  team1_pick_player: draftLine,
  team2_pick_hero: draftLine,
  team2_pick_player: draftLine,
  team1_ban_hero: draftLine,
  team2_ban_hero: draftLine,
});

// ─── results ─────────────────────────────────────────────────────────────────

export const placementSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  place: z.coerce.number().int().min(1).max(64),
  team_id: optionalId,
  team_label: optionalText,
  prize: optionalText,
  note: optionalText,
});

export const placementDeleteSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  placement_id: z.coerce.number().int().positive(),
});

export const awardSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  award_id: optionalId,
  title: trimmed.min(2, { error: "Укажите название награды" }),
  nickname: optionalText,
  team_id: optionalId,
  note: optionalText,
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const awardDeleteSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  award_id: z.coerce.number().int().positive(),
});

export const deleteEntitySchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});
