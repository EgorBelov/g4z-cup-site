import { z } from "zod";
import { normalizeProfileUrl, safePlayerReturn } from "@/lib/validation/profile";

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

/** A `<input type="date">` value: plain YYYY-MM-DD, no zone conversion. */
const optionalDay = trimmed
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: "Дата в формате ГГГГ-ММ-ДД",
  })
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

// bo2 is a group-stage format: both maps are played, so a series can end 1:1.
const bestOf = z.coerce
  .number()
  .int()
  .refine((value) => [1, 2, 3, 5, 7].includes(value), {
    error: "Формат серии: 1, 2, 3, 5 или 7",
  });

// ─── auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  password: z.string().min(1, { error: "Введите пароль" }),
  redirectTo: optionalText,
});

const profileUrl = (kind: "steam" | "faceit" | "dotabuff", optional = false) =>
  z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value, ctx) => {
      if (!value && optional) return null;
      try {
        return normalizeProfileUrl(value ?? "", kind);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Некорректная ссылка",
        });
        return z.NEVER;
      }
    });
const rating = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().int().min(0).max(20000).nullish(),
  )
  .transform((v) => v ?? null);
export const profileSchema = z.object({
  nickname: trimmed.min(2).max(80),
  telegram_username: trimmed
    .transform((v) => v.replace(/^@/, ""))
    .pipe(
      z
        .string()
        .regex(
          /^[A-Za-z0-9_]{5,32}$/,
          "От 5 до 32 латинских букв, цифр и подчёркиваний",
        ),
    ),
  steam_url: profileUrl("steam").pipe(z.string()),
  faceit_url: profileUrl("faceit", true),
  dotabuff_url: profileUrl("dotabuff", true),
  dota_mmr: rating,
  cs_elo: rating,
});
export const registerPlayerSchema = profileSchema.extend({
  next: z.string().optional().transform(safePlayerReturn),
});
export const updateProfileSchema = profileSchema.extend({
  version: z.coerce.number().int().min(0),
});
export const playerLoginSchema = z.object({
  next: z.string().optional().transform(safePlayerReturn),
});
export const communityTeamSchema = z.object({
  name: trimmed.min(2).max(80),
  slug: z.union([z.literal(""), slug]).optional(),
  tag: optionalText.pipe(z.string().max(12).nullable()),
  description: optionalText.pipe(z.string().max(2000).nullable()),
  team_id: optionalId,
  team_version: z.coerce.number().int().min(0).optional(),
});
export const registrationCommandSchema = z
  .object({
    action: z.enum([
      "community_invite",
      "community_accept",
      "community_decline",
      "community_revoke",
      "community_remove",
      "community_leave",
      "application_create",
      "interest",
      "invite_create",
      "invite_revoke",
      "invite_accept",
      "invite_decline",
      "self_join",
      "member_slot",
      "member_remove",
      "member_leave",
      "submit",
      "withdraw",
      "review",
      "admin_member",
      "captain_request",
      "captain_direct",
      "second_remove",
      "captain_accept",
      "captain_decline",
      "captain_revoke",
      "team_archive",
      "team_restore",
    ]),
    application_id: optionalId,
    team_id: optionalId,
    tournament_id: optionalId,
    version: z.coerce.number().int().min(0).optional(),
    team_version: z.coerce.number().int().min(0).optional(),
    profile_id: z.uuid().optional(),
    replace_profile_id: z
      .union([z.literal(""), z.uuid()])
      .optional()
      .transform((v) => v || null),
    recipient_id: z
      .union([z.literal(""), z.uuid()])
      .optional()
      .transform((v) => v || null),
    invite_id: optionalId,
    request_id: optionalId,
    token: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .optional(),
    slot: z.enum(["main", "substitute"]).optional(),
    role: z.enum(["main", "second"]).optional(),
    status: z.enum(["accepted", "rejected", "waitlisted"]).optional(),
    reason: optionalText.pipe(z.string().max(1000).nullable()),
    active: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .superRefine((input, ctx) => {
    const required: Record<string, string[]> = {
      community_invite: ["team_id", "recipient_id"],
      community_accept: ["invite_id"],
      community_decline: ["invite_id"],
      community_revoke: ["invite_id"],
      community_remove: ["team_id", "profile_id"],
      community_leave: ["team_id"],
      application_create: ["team_id", "tournament_id"],
      interest: ["tournament_id"],
      invite_create: ["application_id", "version"],
      invite_revoke: ["invite_id", "version"],
      self_join: ["application_id", "version"],
      member_slot: ["application_id", "version", "profile_id", "slot"],
      member_remove: ["application_id", "version", "profile_id"],
      member_leave: ["application_id", "version"],
      submit: ["application_id", "version"],
      withdraw: ["application_id", "version"],
      review: ["application_id", "version", "status"],
      admin_member: ["application_id", "version", "profile_id", "slot", "reason"],
      captain_request: ["team_id", "team_version", "recipient_id", "role"],
      captain_direct: ["team_id", "team_version", "recipient_id", "role", "reason"],
      second_remove: ["team_id", "team_version"],
      captain_accept: ["request_id"],
      captain_decline: ["request_id"],
      captain_revoke: ["request_id"],
      team_archive: ["team_id", "team_version"],
      team_restore: ["team_id", "team_version"],
    };
    for (const key of required[input.action] ?? []) {
      const value = input[key as keyof typeof input];
      if (value === null || value === undefined || value === "")
        ctx.addIssue({ code: "custom", path: [key], message: "Обязательное поле" });
    }
    if (
      ["invite_accept", "invite_decline"].includes(input.action) &&
      !input.token &&
      !input.invite_id
    )
      ctx.addIssue({
        code: "custom",
        path: ["invite_id"],
        message: "Нужно приглашение",
      });
    if (input.action === "review" && input.status === "rejected" && !input.reason)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Укажите причину отказа",
      });
  });
export const playerSearchSchema = z.object({
  team_id: z.coerce.number().int().positive(),
  query: trimmed.min(2).max(80),
});

// ─── tournaments ─────────────────────────────────────────────────────────────

export const tournamentSchema = z.object({
  tournament_id: optionalId,
  discipline: z.enum(["dota2", "cs2", "other"]).default("dota2"),
  game: trimmed.min(2).max(80).default("Dota 2"),
  registration_open: checkbox,
  roster_size: z.coerce.number().int().min(1).max(32).default(5),
  max_substitutes: z.coerce.number().int().min(0).max(32).default(2),
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

export const rosterSchema = z
  .object({
    team_id: z.coerce.number().int().positive(),
    roster_version: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    player_id: z
      .union([z.string(), z.array(z.string())])
      .transform(toArray)
      .pipe(
        z
          .array(
            z
              .string()
              .regex(/^$|^[1-9]\d*$/)
              .transform((id) => (id === "" ? null : Number(id)))
              .refine((id) => id === null || Number.isSafeInteger(id)),
          )
          .max(64),
      ),
    nickname: z
      .union([z.string(), z.array(z.string())])
      .transform(toArray)
      .pipe(z.array(trimmed.max(80)).max(64)),
    real_name: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(toArray),
    role: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(toArray),
    mmr: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(toArray),
    captain: optionalInt,
    is_standin: z
      .union([z.string(), z.array(z.string())])
      .transform(toArray)
      .pipe(z.array(z.enum(["false", "true"]))),
  })
  .superRefine((data, ctx) => {
    if (
      [data.player_id, data.is_standin, data.real_name, data.role, data.mmr].some(
        (values) => values.length !== data.nickname.length,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Некорректные строки состава",
        path: ["player_id"],
      });
    }
    const ids = data.player_id.filter((id) => id !== null);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Игрок повторяется в составе",
        path: ["player_id"],
      });
    }
    if (
      data.captain !== null &&
      (data.captain < 1 || data.captain > data.nickname.length)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Некорректная строка капитана",
        path: ["captain"],
      });
    }
  });

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ─── stages, groups, generation ──────────────────────────────────────────────

export const stageSchema = z
  .object({
    tournament_id: z.coerce.number().int().positive(),
    stage_id: optionalId,
    kind: z.enum(["round_robin", "swiss", "single_elim", "double_elim"]),
    name: trimmed.min(2, { error: "Укажите название этапа" }),
    sort_order: z.coerce.number().int().min(0).default(0),
    best_of: bestOf,
    advance_count: optionalInt,
    playin_count: optionalInt,
    starts_on: optionalDay,
    ends_on: optionalDay,
  })
  .refine(
    (value) =>
      value.starts_on === null ||
      value.ends_on === null ||
      value.ends_on >= value.starts_on,
    { error: "Конец этапа раньше начала", path: ["ends_on"] },
  );

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

// ─── manual history entry ────────────────────────────────────────────────────

export const bulkTeamsSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  group_id: optionalId,
  names: trimmed.min(1, { error: "Введите хотя бы одну команду" }),
});

/**
 * A series that was already played: the score is entered directly and the maps
 * behind it are generated, because the database derives the score from maps.
 */
export const finishedMatchSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
  stage_id: optionalId,
  round_label: trimmed.min(1, { error: "Укажите название матча" }),
  team1_id: z.coerce.number().int().positive(),
  team2_id: z.coerce.number().int().positive(),
  score1: z.coerce.number().int().min(0).max(4),
  score2: z.coerce.number().int().min(0).max(4),
  played_at: optionalText,
  vod_url: optionalUrl,
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
  status: z.enum(["scheduled", "live", "cancelled"]),
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
