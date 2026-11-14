# Discord-автоматизация G4Z CUP — план

Статус: согласовано, в работе. Доступы выданы (бот, приложение, redirect URI).
Область: привязка Discord к профилю, автоматическое создание ролей и голосовых
каналов команд, выдача ролей капитанам и участникам, удаление канала и роли при
закрытии команды, пересинхронизация из кабинета и админки.

## 1. Решения (согласовано)

| Вопрос                        | Решение                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Объём                         | всё сразу: привязка, создание команды, участники, архив, пересинк                                 |
| Второй капитан                | получает роль команды **и** «Капитан»                                                             |
| Каналы                        | только голосовой, текстового нет                                                                  |
| Закрытие команды              | **удалить** голосовой канал и роль команды                                                        |
| Названия                      | роль и канал называются как команда на сайте, без префиксов                                       |
| Организатор                   | отдельной роли нет, организатору выдаётся «Капитан» вручную                                       |
| Капитан без Discord           | ничего не блокируем; канал создаётся, когда появится привязка                                     |
| Игрок без команды             | при привязке просто добавляется на сервер, без ролей                                              |
| Redirect URI                  | `http://localhost:3000/...`, `https://g4z-cup.ru/...`, `https://g4z-cup-site.vercel.app/...`      |
| Тестовый контур               | разрешено создать и удалить `test-` объекты на боевом сервере                                     |

### Права в Discord

Биты: `VIEW_CHANNEL = 1024`, `CONNECT = 1048576`, `SPEAK = 2097152`,
`MANAGE_CHANNELS = 16`, `MANAGE_ROLES = 268435456`, `CREATE_INSTANT_INVITE = 1`.

| Кто                         | Видит канал | Может зайти          | Может говорить |
| --------------------------- | ----------- | -------------------- | -------------- |
| `@everyone`                 | да          | **нет**              | —              |
| Роль команды                | да          | да (только свой)     | да             |
| Роль «Капитан»              | да          | да (**любой** канал) | да             |
| Бот                         | да          | —                    | —              |

Переопределения на каждом канале команды (`type: 0` — роль):

```json
[
  { "id": "@everyone", "type": 0, "allow": "1024", "deny": "1048576" },
  { "id": "<team role>", "type": 0, "allow": "3146752", "deny": "0" },
  { "id": "<captain role>", "type": 0, "allow": "3146752", "deny": "0" }
]
```

`3146752 = 1024 | 1048576 | 2097152`. Разрешение роли перекрывает запрет
`@everyone`, поэтому «Капитан» и состав заходят, а остальные сервера — нет.

### Права бота

`MANAGE_ROLES | MANAGE_CHANNELS | VIEW_CHANNEL | CREATE_INSTANT_INVITE = 268436497`.

`CREATE_INSTANT_INVITE` нужен для `PUT /guilds/{guild}/members/{user}` (`guilds.join`),
`MANAGE_ROLES` — для выдачи ролей и для переопределений канала.

**Роль бота должна стоять выше роли «Капитан» и выше ролей команд**, иначе
Discord вернёт `50013 Missing Permissions` при выдаче роли «Капитан».

## 2. Модель данных (миграция `0018_discord.sql`)

`player_profiles`:

| Колонка                    | Тип         | Назначение                      |
| -------------------------- | ----------- | ------------------------------- |
| `discord_id`               | text unique | ID пользователя Discord         |
| `discord_username`         | text        | для отображения капитану        |
| `discord_linked_at`        | timestamptz | когда привязал                  |
| `discord_token_enc`        | text        | OAuth access token, AES-256-GCM |
| `discord_refresh_enc`      | text        | refresh token, AES-256-GCM      |
| `discord_token_expires_at` | timestamptz | срок access token               |
| `discord_in_guild`         | boolean     | подтверждённое членство         |

`community_teams`:

| Колонка                    | Тип         | Назначение                       |
| -------------------------- | ----------- | -------------------------------- |
| `discord_role_id`          | text        | роль команды                     |
| `discord_voice_channel_id` | text        | голосовой канал                  |
| `discord_synced_at`        | timestamptz | последняя успешная синхронизация |
| `discord_error`            | text        | последняя ошибка для кабинета    |

`discord_role_grants` — что бот уже выдал (нужно, чтобы снимать роли ушедшим,
не запрашивая список участников сервера и не включая привилегированный intent):

```sql
create table public.discord_role_grants (
  profile_id uuid not null references public.player_profiles(id) on delete cascade,
  role_id text not null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);
```

RLS включён, `revoke all` у `anon`/`authenticated`, доступ только `service_role`.

Токены в базе — только шифротекст. Ключ — HKDF-SHA256 от `AUTH_SECRET`
(соль `g4z.discord.tokens.v1`), формат `iv|tag|ciphertext` в base64url.
Публичные проекции (`public_community_team`, `match_details`, `standings`) не меняются.

## 3. Привязка Discord (OAuth2 + `guilds.join`)

1. `/me/profile` — блок «Discord»: статус и кнопка «Привязать Discord».
2. `GET /auth/discord/start` — требует вход игрока, кладёт подписанный
   (AES-GCM, `g4z_discord_state`) `state` в httpOnly-cookie и уводит на
   `https://discord.com/oauth2/authorize` со `scope=identify guilds.join`.
3. `GET /auth/discord/callback` — сверяет `state` с cookie, меняет `code` на
   токены, читает `GET /users/@me`, сохраняет `discord_id`/`discord_username`,
   шифрует токены.
4. `PUT /guilds/{guild}/members/{discord_id}` с `access_token` — добавляет на
   сервер. Успех → `discord_in_guild = true`.
5. `after()` — синхронизация ролей: если игрок капитан, получает «Капитан»;
   если состоит в команде — роль команды.
6. «Отвязать» — сначала снимаем выданные роли (пока знаем `discord_id`), затем
   чистим поля. Если Discord недоступен — отвязка не выполняется, чтобы не
   оставить «висячие» роли.

Без привязки игрок остаётся полноценным: Discord ничего не блокирует.

## 4. Провижининг команды

`syncTeam(teamId)` идемпотентен, вызывается из `after()` после каждого действия
над командой (`team_create`, `team_update`, `team_archive`, `team_restore`,
участники, капитаны, принятие приглашения).

1. Команда закрыта → удалить канал и роль (если id сохранены), удалить гранты,
   пересчитать роли капитанов.
2. Роль: если id нет или Discord ответил 404 — создать роль с именем команды,
   цветом акцента сайта (`0xd0df97`), `mentionable: false`, `hoist: false`.
3. Канал: если id нет или 404 — создать голосовой канал в категории
   `DISCORD_TEAMS_CATEGORY_ID` с переопределениями из раздела 1.
   Имя команды изменилось — переименовать роль и канал.
4. Переопределения перезаписываются на каждом синке (дешёвый PATCH).
5. Роли участникам: желаемые — оба капитана и `community_members`; сравнение с
   `discord_role_grants` даёт точный список «выдать» и «снять».
6. «Капитан»: желаемые — капитаны всех незакрытых команд; тот же дифф по грантам.
   Участник без привязки или не на сервере — роль не выдаётся, грант не пишется.
7. Если участник привязан, но `discord_in_guild = false` — пробуем `guilds.join`
   его токеном (refresh при истечении). Ошибка → `discord_error`, остальные
   участники обрабатываются.
8. Сохраняем `discord_synced_at`, очищаем `discord_error`.

Ошибки не откатывают действие на сайте: пишем `audit_log` + `discord_error`,
в кабинете капитана и в админке есть кнопка «Пересинхронизировать».

## 5. API-вызовы

| Действие           | Метод                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Роль               | `POST /guilds/{guild}/roles`                                         |
| Переименовать      | `PATCH /guilds/{guild}/roles/{id}`                                   |
| Канал              | `POST /guilds/{guild}/channels` (`type: 2`)                          |
| Переименовать      | `PATCH /channels/{id}` (`name`, `permission_overwrites`)             |
| Удалить            | `DELETE /channels/{id}`, `DELETE /guilds/{guild}/roles/{id}`         |
| Добавить на сервер | `PUT /guilds/{guild}/members/{user}` c `access_token`                |
| Выдать/снять роль  | `PUT`/`DELETE /guilds/{guild}/members/{user}/roles/{role}`           |
| OAuth              | `POST /api/oauth2/token`, `GET /users/@me`                           |

Клиент: таймаут 6 с, до двух повторов на 429 с учётом `retry_after`, разбор
ошибки в `DiscordError` (`status`, `code`, `message`).

## 6. Файлы

- `supabase/migrations/0018_discord.sql` — схема.
- `lib/discord/config.ts` — env с проверкой снежинок, `discordConfigured()`.
- `lib/discord/permissions.ts` — биты, переопределения, `BigInt`-строки (чистые
  функции, покрыты юнит-тестами).
- `lib/discord/rest.ts` — fetch, 429, `DiscordError`, эндпоинты.
- `lib/discord/tokens.ts` — AES-256-GCM для токенов.
- `lib/discord/state.ts` — подписанный `state` для OAuth.
- `lib/discord/oauth.ts` — authorize URL, обмен кода, refresh, `/users/@me`.
- `lib/discord/provision.ts` — `syncTeam`, `deleteTeamDiscord`, `syncCaptainRoles`,
  `addToGuild`, `sanitizeName`.
- `app/auth/discord/start/route.ts`, `app/auth/discord/callback/route.ts`.
- `lib/actions/discord.ts` — отвязка, пересинк команды капитаном, пересинк
  организатором.
- `components/player/DiscordForms.tsx` — кнопки/формы.
- UI: `app/(account)/me/profile/page.tsx`, `app/(account)/me/teams/[id]/page.tsx`,
  `app/admin/community/[id]/page.tsx`.
- `lib/actions/registration.ts` — `after(() => syncTeam(...))` после действий.
- Тесты: `tests/unit/discord-permissions.test.ts`, `tests/unit/discord-tokens.test.ts`,
  `tests/unit/discord-rest.test.ts`, e2e на блок Discord, SQL-ассерты.

## 7. Роадмап и статус

1. **M1** — миграция, клиент, права, шифрование, `syncTeam`. `готово`
2. **M2** — OAuth-роуты, блок в профиле. `готово`
3. **M3** — создание команды: роль, канал, выдача капитану. `готово`
4. **M4** — участники, смена капитана, выход/исключение. `готово`
5. **M5** — закрытие команды, пересинк в кабинете и админке. `готово`
6. **M6** — тесты и живой smoke на сервере. `готово`

### Результаты живой проверки (сервер G4Z CUP)

Проверено настоящими вызовами API на сервере, временная команда `Discord Smoke`
создана и удалена:

- роль создана с именем команды, цветом акцента, `permissions=0`;
- голосовой канал создан в категории с тремя переопределениями ровно из раздела 1
  (`@everyone` allow 1024 / deny 1048576, роль команды и «Капитан» allow 3146752);
- бот выдал себе роль команды и «Капитан» — значит выдача и снятие ролей работают;
- после `archived = true` канал и роль удалены, гранты очищены, «Капитан» снят;
- состояние базы после уборки: 0 привязанных профилей, 0 грантов, команды нет.

### Что выяснилось на живом сервере

- Бот уже состоит в сервере; его права — Manage Roles, Manage Channels, View
  Channels, Create Invite. В списке ролей у бота есть верхняя роль с Administrator,
  поэтому иерархия позволяет управлять «Капитаном».
- На сервере уже были вручную созданные роли команд. Чтобы не плодить дубликаты,
  `syncTeam` **подхватывает** существующую роль с точным именем команды, если она
  ровно одна, и голосовой канал с тем же именем в категории `[TEAMS]`.
- Категория: «Все на месте спортсмены [TEAMS]» (`DISCORD_TEAMS_CATEGORY_ID`).

## 8. Что должен сделать владелец сервера

- Держать роль бота выше роли «Капитан» (сейчас выше за счёт верхней роли).
- Не удалять вручную категорию `DISCORD_TEAMS_CATEGORY_ID` и роль «Капитан»:
  без них синхронизация пишет ошибку в кабинет, но сайт продолжает работать.
- При смене домена добавить `…/auth/discord/callback` в приложение Discord.

## 9. Открытые вопросы

Нет. Все развилки закрыты в разделе 1.
