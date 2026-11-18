-- Private bot subscriptions. Receiving messages never grants organiser access.
create table public.telegram_admin_chats (
  bot_id text not null check (bot_id ~ '^[1-9][0-9]*$'),
  username text not null check (username ~ '^[a-z0-9_]{5,32}$'),
  chat_id text not null check (chat_id ~ '^[1-9][0-9]*$'),
  active boolean not null default true,
  primary key (bot_id, username),
  unique (bot_id, chat_id)
);
alter table public.telegram_admin_chats enable row level security;
revoke all on public.telegram_admin_chats from public, anon, authenticated;
grant select, insert, update, delete on public.telegram_admin_chats to service_role;
