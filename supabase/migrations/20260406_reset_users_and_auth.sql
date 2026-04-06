-- ATENCION: script destructivo.
-- Borra todos los usuarios y datos de Quokki para reiniciar desde cero.
-- Ejecutar manualmente en Supabase SQL Editor (rol postgres).

begin;

truncate table if exists public.app_active_sessions restart identity cascade;
truncate table if exists public.habitos_diarios restart identity cascade;
truncate table if exists public.app_user_state restart identity cascade;
truncate table if exists public.profiles restart identity cascade;

-- Limpiar autenticacion (todos los usuarios)
delete from auth.users;

commit;
