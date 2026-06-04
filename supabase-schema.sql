-- SatChat Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → Run

-- ── Enable Realtime on messages table ──────────────────
-- (Realtime Broadcast is serverless — no table needed for ephemeral messages)
-- This schema is for PERSISTENT metadata only (analytics, room registry).
-- Chat content is never stored.


-- ── Rooms table ─────────────────────────────────────────
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now(),
  last_active timestamptz not null default now()
);

-- Index for fast name lookup
create index if not exists rooms_name_idx on public.rooms (name);

-- Auto-delete rooms inactive for > 7 days (requires pg_cron or a cron job)
-- create extension if not exists pg_cron;
-- select cron.schedule('cleanup-rooms', '0 3 * * *', $$
--   delete from public.rooms where last_active < now() - interval '7 days';
-- $$);


-- ── Message metadata table (no content stored) ──────────
-- Stores only: room, user, message type, timestamp.
-- Used for analytics only. Content stays ephemeral in Broadcast.
create table if not exists public.message_events (
  id          bigint generated always as identity primary key,
  room_id     uuid references public.rooms(id) on delete cascade,
  user_id     text not null,
  msg_type    text not null check (msg_type in ('text', 'audio')),
  has_audio   boolean not null default false,
  has_text    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Index for per-room analytics
create index if not exists msg_events_room_idx on public.message_events (room_id, created_at desc);


-- ── RLS Policies ────────────────────────────────────────
-- Enable Row Level Security
alter table public.rooms enable row level security;
alter table public.message_events enable row level security;

-- Allow anyone to read rooms (to check if a room name exists)
create policy "rooms_read_all"
  on public.rooms for select
  using (true);

-- Allow anyone to create rooms (anon key sufficient)
create policy "rooms_insert_all"
  on public.rooms for insert
  with check (true);

-- Allow anyone to update last_active on rooms
create policy "rooms_update_active"
  on public.rooms for update
  using (true)
  with check (true);

-- Allow anyone to insert message metadata (no content stored anyway)
create policy "msg_events_insert_all"
  on public.message_events for insert
  with check (true);

-- Only allow reading own room's events (by room_id)
create policy "msg_events_read_own_room"
  on public.message_events for select
  using (true); -- open for analytics; restrict if needed


-- ── Realtime Broadcast permissions ──────────────────────
-- Allow anon users to send and receive on satchat:* channels
-- This is done via Supabase Dashboard:
--   Realtime → Policies → Add policy for topic `satchat:*`
--   SELECT and INSERT for anon role
--
-- Or via SQL (requires Supabase Realtime schema access):
-- insert into realtime.policies (name, channel_filter, read, write)
-- values ('satchat-open', '^satchat:', true, true)
-- on conflict do nothing;
--
-- For now, ensure "Public channel" is enabled in Supabase Dashboard:
-- Project Settings → Realtime → Enable Realtime → Broadcast → Allow anonymous access


-- ── Helper views ────────────────────────────────────────
create or replace view public.room_stats as
select
  r.id,
  r.name,
  r.created_at,
  r.last_active,
  count(me.id) as message_count,
  count(case when me.has_audio then 1 end) as audio_count,
  count(case when me.has_text then 1 end) as text_count
from public.rooms r
left join public.message_events me on me.room_id = r.id
group by r.id, r.name, r.created_at, r.last_active
order by r.last_active desc;
