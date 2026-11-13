/** Isolated PostgREST stand-in for visual/navigation tests. Never uses real credentials. */
import { createServer } from "node:http";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const stamp = "2026-08-03T15:00:00Z";
const base = {
  discipline: "dota2",
  registration_open: false,
  roster_size: 5,
  max_substitutes: 2,
  edition: 11,
  status: "live",
  is_current: false,
  starts_at: stamp,
  ends_at: "2026-08-09T18:00:00Z",
  time_zone: "Europe/Moscow",
  format_summary: "Группы BO2 / Double Elimination BO3",
  description: "Свои люди, честная игра и ещё один повод встретиться.",
  prize_pool: "Кубок сообщества",
  stream_url: "https://www.twitch.tv/g4zcup_ru",
  telegram_url: "https://t.me/g4zagzes",
  logo_url: null,
  created_at: stamp,
  updated_at: stamp,
};
const tournaments = [
  {
    ...base,
    id: 1,
    slug: "orbit-dota",
    name: "G4Z CUP 11",
    game: "Dota 2",
    is_current: true,
  },
  {
    ...base,
    id: 2,
    slug: "orbit-cs",
    name: "G4Z CS2: осенний кубок сообщества",
    game: "CS2",
    discipline: "cs2",
    status: "upcoming",
  },
  {
    ...base,
    id: 3,
    slug: "orbit-archive",
    name: "G4Z CUP 10",
    game: "Dota 2",
    status: "finished",
    edition: 10,
  },
  {
    ...base,
    id: 4,
    slug: "orbit-empty",
    name: "Первый турнир",
    game: "Другая игра",
    discipline: "other",
    status: "upcoming",
  },
];
tournaments.push({
  ...base,
  id: 13,
  slug: "g4z-cup-13",
  name: "G4Z CUP 13",
  edition: 13,
  game: "Dota 2",
  status: "upcoming",
  registration_open: true,
  starts_at: null,
  ends_at: null,
});

// Actual PostgreSQL functions, constraints and grants back registration tests.
// Only the external Telegram consent/code exchange is simulated.
const registrationDb = await PGlite.create();
await registrationDb.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create table auth.users(id uuid primary key);
  grant usage on schema public to service_role;
  alter default privileges in schema public grant all on tables to service_role;
  alter default privileges in schema public grant all on sequences to service_role;`);
for (const file of readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await registrationDb.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
for (const t of tournaments)
  await registrationDb.query(
    `insert into public.tournaments(id,slug,name,game,discipline,status,registration_open,roster_size,max_substitutes) overriding system value values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      t.id,
      t.slug,
      t.name,
      t.game,
      t.discipline,
      t.status,
      t.registration_open,
      t.roster_size,
      t.max_substitutes,
    ],
  );
await registrationDb.exec(
  "alter sequence teams_id_seq restart with 10000;alter sequence players_id_seq restart with 1000000;",
);
const privateRegistrationTables = new Set([
  "player_profiles",
  "player_ratings",
  "community_teams",
  "community_members",
  "community_member_invites",
  "registration_teams",
  "team_members",
  "team_invites",
  "captain_requests",
  "participation_interests",
  "registration_revisions",
  "registration_events",
  "registration_limits",
]);
const rpcDefinitions = {
  registration_throttle: [
    ["p_key", "p_limit", "p_window"],
    ["text", "integer", "integer"],
  ],
  register_player: [
    ["p_user", "p_telegram_id", "p_verified_username", "p_profile", "p_ip"],
    ["uuid", "text", "text", "jsonb", "text"],
  ],
  community_member_command: [
    ["p_actor", "p_admin", "p_action", "p_input", "p_ip"],
    ["uuid", "boolean", "text", "jsonb", "text"],
  ],
  registration_command: [
    ["p_actor", "p_admin", "p_action", "p_input", "p_ip"],
    ["uuid", "boolean", "text", "jsonb", "text"],
  ],
  public_community_team: [["p_slug"], ["text"]],
  search_registration_players: [
    ["p_actor", "p_admin", "p_team", "p_query"],
    ["uuid", "boolean", "bigint", "text"],
  ],
};
const stages = [1, 2, 3].flatMap((id) => [
  {
    id: id * 10,
    tournament_id: id,
    kind: "round_robin",
    name: "Групповой этап",
    sort_order: 0,
    best_of: 2,
    advance_count: 2,
    playin_count: 1,
    starts_on: "2026-08-03",
    ends_on: "2026-08-06",
  },
  {
    id: id * 10 + 1,
    tournament_id: id,
    kind: id === 2 ? "single_elim" : "double_elim",
    name: "Плей-офф",
    sort_order: 1,
    best_of: 3,
    advance_count: null,
    playin_count: null,
    starts_on: "2026-08-07",
    ends_on: "2026-08-09",
  },
]);
const groups = [1, 2, 3].map((id) => ({
  id,
  tournament_id: id,
  stage_id: id * 10,
  name: "Группа A",
  sort_order: 0,
}));
const teams = [1, 2, 3].flatMap((id) => [
  {
    id: id * 10,
    tournament_id: id,
    slug: "alpha",
    name: "ОЧЕНЬ ДЛИННОЕ НАЗВАНИЕ КОМАНДЫ БЕЗ СОКРАЩЕНИЙ",
    tag: "ALPHA",
    group_id: id,
    seed: 1,
    logo_url: null,
    description: "Играем вместе с первого сезона.",
  },
  {
    id: id * 10 + 1,
    tournament_id: id,
    slug: "bravo",
    name: "ТРОПИКАЛ",
    tag: "TR",
    group_id: id,
    seed: 2,
    logo_url: null,
    description: null,
  },
  {
    id: id * 10 + 2,
    tournament_id: id,
    slug: "charlie",
    name: "REHUB",
    tag: "RHB",
    group_id: id,
    seed: 3,
    logo_url: null,
    description: null,
  },
]);
for (const [index, viewport] of ["desktop", "mobile"].entries()) {
  teams.push({
    id: 900 + index,
    tournament_id: 1,
    slug: `roster-${viewport}`,
    name: `Состав ${viewport}`,
    tag: "TEST",
    group_id: null,
    seed: null,
    logo_url: null,
    description: null,
  });
}
for (const team of teams) team.roster_version = 0;
let players = teams.flatMap((team) =>
  Array.from({ length: 7 }, (_, n) => ({
    id: team.id * 10 + n,
    team_id: team.id,
    nickname: n === 0 ? "ОченьДлинныйНикИгрокаБезПробелов123456" : `player_${n + 1}`,
    real_name: team.id >= 900 ? "PRIVATE_REAL_NAME" : null,
    role: "Support",
    is_captain: n === 0,
    is_standin: n >= 5,
    mmr: n === 1 ? null : 4000 + n * 100,
    steam_url: team.id >= 900 ? "https://steamcommunity.com/id/PRIVATE_STEAM" : null,
    dotabuff_url: team.id >= 900 ? "https://www.dotabuff.com/players/123456789" : null,
    sort_order: n + 1,
  })),
);
function match(tid, n, overrides = {}) {
  const t = tournaments.find((t) => t.id === tid);
  const [a, b] = teams.filter((team) => team.tournament_id === tid);
  return {
    id: tid * 100 + n,
    tournament_id: tid,
    tournament_slug: t.slug,
    tournament_name: t.name,
    stage_id: tid * 10,
    stage_name: "Групповой этап",
    stage_kind: "round_robin",
    stage_order: 0,
    group_id: tid,
    group_name: "Группа A",
    round: 1,
    round_label: "Тур 1",
    position: n,
    bracket: null,
    best_of: 2,
    team1_id: a.id,
    team2_id: b.id,
    team1_name: a.name,
    team2_name: b.name,
    team1_slug: a.slug,
    team2_slug: b.slug,
    team1_tag: a.tag,
    team2_tag: b.tag,
    team1_logo: null,
    team2_logo: null,
    team1_source: null,
    team2_source: null,
    score1: 1,
    score2: 0,
    winner_id: null,
    loser_id: null,
    status: "live",
    scheduled_at: stamp,
    started_at: stamp,
    finished_at: null,
    stream_url: t.stream_url,
    vod_url: null,
    notes: null,
    is_featured: true,
    games_count: 1,
    winner_to_match_id: null,
    winner_to_slot: null,
    loser_to_match_id: null,
    loser_to_slot: null,
    ...overrides,
  };
}
const matches = [1, 2, 3].flatMap((id) => [
  match(id, 1),
  match(id, 2, {
    status: "scheduled",
    score1: 0,
    score2: 0,
    scheduled_at: "2026-08-04T15:00:00Z",
  }),
  match(id, 3, { status: "finished", score1: 1, score2: 1, finished_at: stamp }),
  ...[1, 2, 3].map((round) =>
    match(id, 10 + round, {
      stage_id: id * 10 + 1,
      stage_name: "Плей-офф",
      stage_kind: id === 2 ? "single_elim" : "double_elim",
      stage_order: 1,
      group_id: null,
      group_name: null,
      best_of: 3,
      round,
      round_label: `Раунд ${round}`,
      bracket: round === 3 ? "final" : "upper",
      status: "scheduled",
      score1: 0,
      score2: 0,
    }),
  ),
  ...(id === 2
    ? []
    : [
        match(id, 20, {
          stage_id: id * 10 + 1,
          stage_name: "Плей-офф",
          stage_kind: "double_elim",
          stage_order: 1,
          group_id: null,
          group_name: null,
          bracket: "lower",
          best_of: 3,
          round_label: "Нижняя сетка",
          status: "scheduled",
          score1: 0,
          score2: 0,
        }),
      ]),
]);
matches.push(match(1, 4)); // Reserved for the two-session live update test.
for (const n of [5, 6]) {
  matches.push(
    match(1, n, {
      status: "scheduled",
      score1: 0,
      score2: 0,
      started_at: null,
      is_featured: false,
    }),
  );
}
const games = matches
  .filter((m) => m.status !== "scheduled")
  .flatMap((m) =>
    Array.from({ length: m.score1 + m.score2 }, (_, n) => ({
      id: m.id * 10 + n,
      match_id: m.id,
      game_number: n + 1,
      winner_id: n === 0 ? m.team1_id : m.team2_id,
      radiant_team_id: m.team1_id,
      first_pick_team_id: m.team1_id,
      duration_seconds: 2312,
      dota_match_id: null,
      notes: null,
    })),
  );
const standings = teams.map((team, index) => ({
  tournament_id: team.tournament_id,
  stage_id: team.tournament_id * 10,
  stage_name: "Групповой этап",
  group_id: team.group_id,
  group_name: "Группа A",
  group_order: 0,
  team_id: team.id,
  team_name: team.name,
  team_slug: team.slug,
  team_tag: team.tag,
  team_logo: null,
  seed: team.seed,
  advance_count: 2,
  playin_count: 1,
  played: 2,
  wins: index % 3 === 0 ? 1 : 0,
  draws: 1,
  losses: 0,
  maps_won: 3,
  maps_lost: 1,
  map_diff: 2,
  points: index % 3 === 0 ? 3 : 1,
}));
const placements = teams
  .filter((t) => t.tournament_id === 3)
  .map((t, i) => ({
    id: i + 1,
    tournament_id: 3,
    place: i + 1,
    team_id: t.id,
    team_label: null,
    note: i === 0 ? "Чемпион" : null,
    prize: null,
  }));
const data = {
  tournaments,
  stages,
  groups,
  teams,
  players,
  matches,
  match_details: matches,
  games,
  standings,
  placements,
  tournament_summaries: tournaments.map((t) => ({
    ...t,
    team_count: teams.filter((team) => team.tournament_id === t.id).length,
    match_count: matches.filter((m) => m.tournament_id === t.id).length,
    champion_name: t.id === 3 ? "REHUB" : null,
  })),
  game_picks: games
    .filter((g) => g.match_id < 200)
    .map((g) => ({
      id: g.id,
      game_id: g.id,
      team_id: 10,
      hero: "Puck",
      player_id: 100,
      player_name: "player_1",
      order_no: 1,
    })),
  game_bans: [],
  heroes: [{ id: 1, name: "Puck", localized_name: "Puck" }],
  awards: [
    {
      id: 1,
      tournament_id: 3,
      title: "Игрок турнира",
      nickname: "player_1",
      team_label: "REHUB",
      player_id: null,
      team_id: null,
      note: null,
      sort_order: 0,
    },
  ],
  audit_log: [],
  login_attempts: [],
};

// Fake Auth exercises our callback/cookies against the real SSR SDK. It does
// not pretend to verify Telegram or replace the mandatory real login check.
const authCodes = new Map();
const authSessions = new Map();
const authRefreshTokens = new Map();
const authUser = {
  id: "a1000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "",
  phone: "",
  app_metadata: { provider: "custom:telegram", providers: ["custom:telegram"] },
  // Deliberately different: code must use the confirmed provider identity.
  user_metadata: { preferred_username: "editable_untrusted_name" },
  identities: [
    {
      id: "1234567890",
      identity_id: "a2000000-0000-4000-8000-000000000001",
      user_id: "a1000000-0000-4000-8000-000000000001",
      provider: "custom:telegram",
      identity_data: {
        sub: "1234567890",
        iss: "https://oauth.telegram.org",
        preferred_username: "fixture_player",
      },
      created_at: stamp,
      updated_at: stamp,
    },
  ],
  created_at: stamp,
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function fixtureAuthUser(number = 1) {
  if (number === 1) return authUser;
  const user = structuredClone(authUser);
  user.id = `a1000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  user.identities[0].id = String(1234567890 + number);
  user.identities[0].user_id = user.id;
  user.identities[0].identity_data.sub = user.identities[0].id;
  user.identities[0].identity_data.preferred_username = `fixture_player_${number}`;
  return user;
}
function issueAuthSession(user = authUser) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      session_id: randomUUID(),
    }),
  ).toString("base64url");
  const unsigned = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${payload}`;
  const access = `${unsigned}.${createHmac("sha256", "fixture-auth-only").update(unsigned).digest("base64url")}`;
  const session = {
    access_token: access,
    refresh_token: randomUUID(),
    token_type: "bearer",
    expires_in: 3600,
    user,
  };
  authSessions.set(access, session);
  authRefreshTokens.set(session.refresh_token, session);
  return session;
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:54329");
  if (url.pathname === "/health") {
    res.end("ok");
    return;
  }
  const rpcName = url.pathname.replace("/rest/v1/rpc/", "");
  if (
    req.method === "POST" &&
    url.pathname.startsWith("/rest/v1/rpc/") &&
    Object.hasOwn(rpcDefinitions, rpcName)
  ) {
    const service = req.headers.apikey === "fixture-service-key";
    if (!service && rpcName !== "public_community_team") {
      json(res, 403, { code: "42501", message: "permission denied" });
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const input = JSON.parse(raw);
      const [names, casts] = rpcDefinitions[rpcName];
      const args = names.map((name) => input[name] ?? null);
      const result = await registrationDb.transaction(async (tx) => {
        await tx.exec(`set local role ${service ? "service_role" : "anon"}`);
        return tx.query(
          `select public.${rpcName}(${casts.map((cast, i) => `$${i + 1}::${cast}`).join(",")}) as result`,
          args,
        );
      });
      json(res, 200, result.rows[0].result);
    } catch (error) {
      json(res, 400, { code: error.code ?? "XX000", message: error.message });
    }
    return;
  }
  if (req.method === "GET" && url.pathname === "/auth/v1/authorize") {
    const callback = url.searchParams.get("redirect_to");
    const challenge = url.searchParams.get("code_challenge");
    if (
      url.searchParams.get("provider") !== "custom:telegram" ||
      callback !== "http://127.0.0.1:3000/auth/callback" ||
      !challenge ||
      url.searchParams.get("code_challenge_method") !== "s256"
    ) {
      json(res, 400, { code: "validation_failed", msg: "Invalid fixture OAuth start" });
      return;
    }
    const code = randomUUID();
    const number = Number(url.searchParams.get("fixture_user") ?? 1);
    const user = fixtureAuthUser(
      Number.isInteger(number) && number >= 1 && number <= 1000 ? number : 1,
    );
    await registrationDb.query(
      "insert into auth.users(id)values($1)on conflict do nothing",
      [user.id],
    );
    authCodes.set(code, { challenge, user });
    res.writeHead(302, {
      Location: `${callback}?code=${code}`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const input = JSON.parse(body);
      const grant = url.searchParams.get("grant_type");
      let valid = false;
      let user = authUser;
      if (grant === "pkce") {
        const expected = authCodes.get(input.auth_code);
        const actual =
          typeof input.code_verifier === "string"
            ? createHash("sha256").update(input.code_verifier).digest("base64url")
            : null;
        valid = Boolean(expected && expected.challenge === actual);
        if (valid) user = expected.user;
        // A mismatched browser must not consume another browser's code.
        if (valid) authCodes.delete(input.auth_code);
      } else if (grant === "refresh_token") {
        const old = authRefreshTokens.get(input.refresh_token);
        valid = Boolean(old);
        if (old) {
          user = old.user;
          authSessions.delete(old.access_token);
          authRefreshTokens.delete(input.refresh_token);
        }
      }
      json(
        res,
        valid ? 200 : 400,
        valid
          ? issueAuthSession(user)
          : { code: "bad_code_verifier", msg: "Invalid fixture exchange" },
      );
    });
    return;
  }
  if (url.pathname === "/auth/v1/user" || url.pathname === "/auth/v1/logout") {
    const access = req.headers.authorization?.replace(/^Bearer /, "");
    const session = authSessions.get(access);
    if (!session) {
      json(res, 401, { code: "bad_jwt", msg: "Invalid fixture session" });
    } else if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
      authSessions.delete(access);
      authRefreshTokens.delete(session.refresh_token);
      res.writeHead(204);
      res.end();
    } else {
      json(res, 200, session.user);
    }
    return;
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/save_roster") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const input = JSON.parse(body);
      const team = teams.find((t) => t.id === input.p_team_id);
      if (
        ![900, 901].includes(team?.id) ||
        req.headers.apikey !== "fixture-service-key"
      ) {
        res.writeHead(405);
        res.end("Read-only fixture");
        return;
      }
      let error;
      if (team.roster_version !== input.p_expected_version)
        error = {
          code: "40001",
          message: "Состав уже изменён. Обновите страницу перед сохранением.",
        };
      else if (
        input.p_players.some(
          (p) =>
            p.id !== null &&
            !players.some((old) => old.id === p.id && old.team_id === team.id),
        )
      )
        error = { code: "23514", message: "Игрок не принадлежит этой команде" };
      if (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify(error));
        return;
      }
      const roster = input.p_players.map((p, index) => ({
        ...(players.find((old) => old.id === p.id) ?? {
          steam_url: null,
          dotabuff_url: null,
        }),
        ...p,
        id: p.id ?? team.id * 1000 + team.roster_version * 100 + index,
        team_id: team.id,
      }));
      players = players.filter((p) => p.team_id !== team.id).concat(roster);
      data.players = players;
      team.roster_version++;
      res.writeHead(204);
      res.end();
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/set_match_lifecycle") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const { p_match_id: id, p_status: status } = JSON.parse(body);
      const row = matches.find((m) => m.id === id);
      if (status === "scheduled" && games.some((g) => g.match_id === id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            code: "23514",
            message: "Сначала удалите карты матча, чтобы вернуть его в расписание",
          }),
        );
        return;
      }
      // Each viewport owns a separate mutable fixture. SQL tests exercise the
      // real function and its permissions; this stand-in checks action wiring.
      if (
        ![105, 106].includes(id) ||
        !row ||
        !["scheduled", "live", "cancelled"].includes(status)
      ) {
        res.writeHead(405);
        res.end("Read-only fixture");
        return;
      }
      row.status = status;
      row.started_at = status === "scheduled" ? null : stamp;
      res.writeHead(204);
      res.end();
    });
    return;
  }
  if (
    req.method === "POST" &&
    ["/rest/v1/audit_log", "/rest/v1/login_attempts"].includes(url.pathname)
  ) {
    req.resume();
    res.writeHead(201);
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/games") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const row = JSON.parse(body);
      // Only the dedicated live fixture accepts a mutation.
      if (row.match_id !== 104) {
        res.writeHead(405);
        res.end();
        return;
      }
      games.push({
        ...row,
        id: 99999,
        duration_seconds: null,
        radiant_team_id: null,
        dota_match_id: null,
        notes: null,
      });
      const m = matches.find((m) => m.id === 104);
      m.score1 = games.filter(
        (g) => g.match_id === 104 && g.winner_id === m.team1_id,
      ).length;
      m.score2 = games.filter(
        (g) => g.match_id === 104 && g.winner_id === m.team2_id,
      ).length;
      m.status = m.score1 + m.score2 >= 2 ? "finished" : "live";
      res.writeHead(201);
      res.end();
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Read-only fixture");
    return;
  }
  const relation = url.pathname.replace("/rest/v1/", "");
  const registrationPrivate = privateRegistrationTables.has(relation);
  if (registrationPrivate && req.headers.apikey !== "fixture-service-key") {
    json(res, 403, { code: "42501", message: "permission denied" });
    return;
  }
  if (!(relation in data) && !registrationPrivate) {
    res.writeHead(404);
    res.end(JSON.stringify({ message: `Unknown fixture relation ${relation}` }));
    return;
  }
  const columns = url.searchParams.get("select") ?? "*";
  if (
    relation === "players" &&
    req.headers.apikey !== "fixture-service-key" &&
    (columns === "*" || /(?:real_name|steam_url|dotabuff_url|profile_id)/.test(columns))
  ) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ code: "42501", message: "permission denied for table players" }),
    );
    return;
  }
  let rows;
  if (registrationPrivate)
    rows = JSON.parse(
      JSON.stringify(
        (await registrationDb.query(`select * from public.${relation}`)).rows,
      ),
    );
  else if (["teams", "players", "audit_log"].includes(relation))
    rows = data[relation].concat(
      JSON.parse(
        JSON.stringify(
          (await registrationDb.query(`select * from public.${relation}`)).rows,
        ),
      ),
    );
  else rows = data[relation].slice();
  if (relation === "tournament_summaries") {
    const snapshots = (
      await registrationDb.query(
        "select tournament_id,count(*)::integer as n from public.teams group by tournament_id",
      )
    ).rows;
    rows = rows.map((t) => ({
      ...t,
      ...tournaments.find((c) => c.id === t.id),
      team_count:
        t.team_count + (snapshots.find((s) => s.tournament_id === t.id)?.n ?? 0),
    }));
  }
  for (const [field, expression] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(field)) continue;
    if (field === "or") {
      const predicates = [
        ...expression
          .replace(/^\(|\)$/g, "")
          .matchAll(/([a-z_]+)\.(eq|in)\.(\([^)]*\)|[^,]*)/g),
      ];
      rows = rows.filter((row) =>
        predicates.some((part) => {
          const [, column, operator, value] = part;
          return operator === "eq"
            ? String(row[column]) === value
            : value
                .replace(/^\(|\)$/g, "")
                .split(",")
                .includes(String(row[column]));
        }),
      );
      continue;
    }
    const [op, ...parts] = expression.split(".");
    const value = parts.join(".");
    if (op === "eq") rows = rows.filter((r) => String(r[field]) === value);
    else if (op === "neq") rows = rows.filter((r) => String(r[field]) !== value);
    else if (op === "in")
      rows = rows.filter((r) =>
        value.slice(1, -1).split(",").includes(String(r[field])),
      );
    else if (op === "is") rows = rows.filter((r) => String(r[field]) === value);
    else if (op === "gte") rows = rows.filter((r) => String(r[field]) >= value);
    else if (op === "gt")
      rows = rows.filter((r) =>
        typeof r[field] === "number"
          ? r[field] > Number(value)
          : String(r[field]) > value,
      );
    else if (op === "lt")
      rows = rows.filter((r) =>
        typeof r[field] === "number"
          ? r[field] < Number(value)
          : String(r[field]) < value,
      );
    else if (op === "ilike")
      rows = rows.filter((r) =>
        String(r[field])
          .toLowerCase()
          .includes(value.replace(/%/g, "").replace(/\\/g, "").toLowerCase()),
      );
    else if (op === "or") continue;
    else {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          message: `Unsupported fixture filter ${field}=${expression}`,
        }),
      );
      return;
    }
  }
  const order = url.searchParams.get("order")?.split(",") ?? [];
  rows.sort((a, b) => {
    for (const term of order) {
      const [field, direction] = term.split(".");
      if (a[field] === b[field]) continue;
      return (a[field] < b[field] ? -1 : 1) * (direction === "desc" ? -1 : 1);
    }
    return 0;
  });
  const total = rows.length;
  if (url.searchParams.has("offset"))
    rows = rows.slice(Number(url.searchParams.get("offset")));
  if (url.searchParams.has("limit"))
    rows = rows.slice(0, Number(url.searchParams.get("limit")));
  const object = req.headers.accept?.includes("application/vnd.pgrst.object+json");
  if (columns !== "*")
    rows = rows.map((row) =>
      Object.fromEntries(columns.split(",").map((column) => [column, row[column]])),
    );
  res.writeHead(object && rows.length > 1 ? 406 : 200, {
    "Content-Type": "application/json",
    "Content-Range": `0-${Math.max(0, rows.length - 1)}/${total}`,
  });
  res.end(JSON.stringify(object ? (rows[0] ?? null) : rows));
}).listen(54329, "127.0.0.1", () =>
  console.log("Isolated tournament fixtures on http://127.0.0.1:54329"),
);
