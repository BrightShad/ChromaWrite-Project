-- ─── ChromaWrite — Supabase Schema ───────────────────────────────────────────
-- Run this in your Supabase project:
-- Dashboard → SQL Editor → New Query → paste this → Run

-- Stories table
create table if not exists public.stories (
  id            text primary key,
  user_id       uuid references auth.users(id) on delete cascade,
  title         text not null default 'Untitled',
  snippet       text,
  mood          text,
  mood_color    text,
  mood_class    text,
  word_count    integer default 0,
  chromatic_arc text[],
  content       text,
  fingerprint   text,
  scene_gallery text,
  elapsed_minutes integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at
  before update on public.stories
  for each row execute function update_updated_at();

-- Row Level Security — users only see their own stories
alter table public.stories enable row level security;

drop policy if exists "Users can read own stories"   on public.stories;
drop policy if exists "Users can insert own stories" on public.stories;
drop policy if exists "Users can update own stories" on public.stories;
drop policy if exists "Users can delete own stories" on public.stories;

create policy "Users can read own stories"
  on public.stories for select
  using (auth.uid() = user_id);

create policy "Users can insert own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stories"
  on public.stories for update
  using (auth.uid() = user_id);

create policy "Users can delete own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- Index for fast user queries
create index if not exists stories_user_id_idx on public.stories(user_id);
create index if not exists stories_created_at_idx on public.stories(created_at desc);
