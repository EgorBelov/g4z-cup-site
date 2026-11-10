/** Isolated PostgREST stand-in for visual/navigation tests. Never uses real credentials. */
import { createServer } from "node:http";

const stamp = "2026-08-03T15:00:00Z";
const base = {
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
    status: "upcoming",
  },
];
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
const players = teams.flatMap((team) =>
  Array.from({ length: 7 }, (_, n) => ({
    id: team.id * 10 + n,
    team_id: team.id,
    nickname: n === 0 ? "ОченьДлинныйНикИгрокаБезПробелов123456" : `player_${n + 1}`,
    real_name: null,
    role: "Support",
    is_captain: n === 0,
    is_standin: n >= 5,
    mmr: n === 1 ? null : 4000 + n * 100,
    steam_url: null,
    dotabuff_url: null,
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

createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:54329");
  if (url.pathname === "/health") {
    res.end("ok");
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
  if (!(relation in data)) {
    res.writeHead(404);
    res.end(JSON.stringify({ message: `Unknown fixture relation ${relation}` }));
    return;
  }
  let rows = data[relation].slice();
  for (const [field, expression] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(field)) continue;
    if (field === "or") {
      const predicates = expression.replace(/^\(|\)$/g, "").split(",");
      rows = rows.filter((row) =>
        predicates.some((part) => {
          const [column, operator, ...parts] = part.split(".");
          return operator === "eq" && String(row[column]) === parts.join(".");
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
  if (url.searchParams.has("limit"))
    rows = rows.slice(0, Number(url.searchParams.get("limit")));
  const object = req.headers.accept?.includes("application/vnd.pgrst.object+json");
  res.writeHead(object && rows.length > 1 ? 406 : 200, {
    "Content-Type": "application/json",
    "Content-Range": `0-${Math.max(0, rows.length - 1)}/${total}`,
  });
  res.end(JSON.stringify(object ? (rows[0] ?? null) : rows));
}).listen(54329, "127.0.0.1", () =>
  console.log("Isolated tournament fixtures on http://127.0.0.1:54329"),
);
