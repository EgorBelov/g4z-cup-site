<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project rules

## Данные

- **Никогда не записывать `matches.score1/score2/status/winner_id/loser_id`
  из приложения.** Их считают триггеры `recalc_match` и `advance_bracket`
  (`supabase/migrations/0002_logic.sql`). Приложение пишет только карты (`games`).
- Публичные чтения — только через `lib/queries/public.ts`, каждое в `use cache`
  с тегом из `lib/cache/tags.ts`. Любая мутация обязана вызвать `updateTag`
  для затронутых тегов, иначе сайт останется со старыми данными.
- Персональные чтения кабинета и проверка приватного приглашения по токену —
  `lib/queries/player.ts` / `registration.ts`, без общего кэша. Контакты других
  игроков не передавать клиентским компонентам, поиску капитанов и Realtime.
- Записи в базу — только через `lib/supabase/write.ts` (service role) внутри
  server actions. Ключ anon даёт лишь чтение, политик на запись в RLS нет.
- Любое изменение схемы — новой миграцией в `supabase/migrations/`, никогда
  правкой существующей. Логику, которую проверяют триггеры или вьюхи, покрывать
  ассертами в `supabase/tests/logic.sql`.

## Безопасность

- Административные server actions начинаются с `assertAdmin()`. Действия игроков
  начинают с `assertPlayer()` (проверенные Supabase Auth + профиль + лимит частоты),
  завершение регистрации — с `assertTelegramSession()`. Начало входа/регистрации
  публично, но проверяет origin и лимит IP через `assertAuthEntry()`. Все проверки
  выполняются внутри action: прямой POST не защищён `proxy.ts`. Telegram-сессия
  никогда не даёт права организатора.
- Каждый вход формы валидируется схемой из `lib/validation/schemas.ts` через
  `parseForm`. Никаких `Number(formData.get(...))` напрямую.
- Секреты не префиксуются `NEXT_PUBLIC_`. Модули с доступом к записи помечены
  `import "server-only"`.

## Время

Время матчей вводится и показывается в часовом поясе турнира
(`tournaments.time_zone`). Для полей `datetime-local` использовать
`toDateTimeLocal` / `fromDateTimeLocal` из `lib/format/date.ts`, а не
`new Date(value)`.

## Стили

Цвета и радиусы — только токенами из `@theme` в `app/globals.css`
(`bg-panel`, `border-edge`, `text-ink-muted`, `rounded-card`…). Не добавлять
`border-white/10 bg-white/5` вручную.
