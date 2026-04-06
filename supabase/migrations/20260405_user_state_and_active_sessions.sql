-- Quokki: persistencia por usuario y sesiones activas
-- Ejecutar en Supabase SQL Editor

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default jsonb_build_object('settings', jsonb_build_object(), 'runtime', jsonb_build_object()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent text not null default '',
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_app_active_sessions_user_id on public.app_active_sessions(user_id);
create index if not exists idx_app_active_sessions_last_seen on public.app_active_sessions(last_seen desc);
create index if not exists idx_app_active_sessions_open on public.app_active_sessions(user_id) where ended_at is null;

-- trigger idempotente para app_user_state.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_app_user_state_updated_at'
  ) THEN
    CREATE TRIGGER trg_app_user_state_updated_at
    BEFORE UPDATE ON public.app_user_state
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

alter table public.app_user_state enable row level security;
alter table public.app_active_sessions enable row level security;

-- Policies: app_user_state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_user_state' AND policyname='app_user_state_select_own'
  ) THEN
    CREATE POLICY app_user_state_select_own
      ON public.app_user_state
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_user_state' AND policyname='app_user_state_insert_own'
  ) THEN
    CREATE POLICY app_user_state_insert_own
      ON public.app_user_state
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_user_state' AND policyname='app_user_state_update_own'
  ) THEN
    CREATE POLICY app_user_state_update_own
      ON public.app_user_state
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Policies: app_active_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_active_sessions' AND policyname='app_active_sessions_select_own'
  ) THEN
    CREATE POLICY app_active_sessions_select_own
      ON public.app_active_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_active_sessions' AND policyname='app_active_sessions_insert_own'
  ) THEN
    CREATE POLICY app_active_sessions_insert_own
      ON public.app_active_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_active_sessions' AND policyname='app_active_sessions_update_own'
  ) THEN
    CREATE POLICY app_active_sessions_update_own
      ON public.app_active_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
