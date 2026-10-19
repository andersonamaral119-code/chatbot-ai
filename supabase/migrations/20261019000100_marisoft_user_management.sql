-- MARISOFT IA: gerenciamento seguro de acesso
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'operator' check (role in ('admin','operator')),
  access_status text not null default 'pending' check (access_status in ('active','pending','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.authorized_emails (
  email text primary key,
  display_name text not null default '',
  role text not null default 'operator' check (role in ('admin','operator')),
  created_at timestamptz not null default now()
);
create or replace function public.marisoft_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin' and p.access_status = 'active'); $$;
alter table public.user_profiles enable row level security;
alter table public.authorized_emails enable row level security;
drop policy if exists "profile self read or admin read" on public.user_profiles;
create policy "profile self read or admin read" on public.user_profiles for select to authenticated using (id = auth.uid() or public.marisoft_is_admin());
drop policy if exists "admin updates profiles" on public.user_profiles;
create policy "admin updates profiles" on public.user_profiles for update to authenticated using (public.marisoft_is_admin()) with check (public.marisoft_is_admin());
drop policy if exists "admins manage authorized emails" on public.authorized_emails;
create policy "admins manage authorized emails" on public.authorized_emails for all to authenticated using (public.marisoft_is_admin()) with check (public.marisoft_is_admin());

create or replace function public.marisoft_guard_last_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.role = 'admin' and OLD.access_status = 'active'
       and not exists(select 1 from public.user_profiles p where p.id <> OLD.id and p.role='admin' and p.access_status='active') then
      raise exception 'Não é permitido remover o último administrador ativo.';
    end if;
    return OLD;
  end if;
  if OLD.role = 'admin' and OLD.access_status = 'active'
     and (NEW.role <> 'admin' or NEW.access_status <> 'active')
     and not exists(select 1 from public.user_profiles p where p.id <> OLD.id and p.role='admin' and p.access_status='active') then
    raise exception 'Não é permitido bloquear ou rebaixar o último administrador ativo.';
  end if;
  NEW.updated_at = now();
  return NEW;
end; $$;
drop trigger if exists marisoft_guard_last_admin on public.user_profiles;
create trigger marisoft_guard_last_admin before update or delete on public.user_profiles for each row execute function public.marisoft_guard_last_admin();

create or replace function public.marisoft_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invitation public.authorized_emails%rowtype;
  admin_exists boolean;
begin
  select * into invitation from public.authorized_emails where lower(email)=lower(new.email) limit 1;
  select exists(select 1 from public.user_profiles where role='admin' and access_status='active') into admin_exists;
  if invitation.email is not null then
    insert into public.user_profiles(id,email,display_name,role,access_status)
    values(new.id, lower(new.email), coalesce(nullif(invitation.display_name,''), new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), invitation.role, 'active')
    on conflict (id) do nothing;
    delete from public.authorized_emails where lower(email)=lower(new.email);
  elsif not admin_exists then
    insert into public.user_profiles(id,email,display_name,role,access_status)
    values(new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'admin', 'active')
    on conflict (id) do nothing;
  else
    insert into public.user_profiles(id,email,display_name,role,access_status)
    values(new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'operator', 'pending')
    on conflict (id) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_marisoft on auth.users;
create trigger on_auth_user_created_marisoft after insert on auth.users for each row execute function public.marisoft_handle_new_user();

-- Keep existing accounts usable; the oldest existing account is the initial administrator.
insert into public.user_profiles(id,email,display_name,role,access_status)
select u.id, lower(u.email), coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
       case when row_number() over(order by u.created_at asc, u.id asc)=1 then 'admin' else 'operator' end, 'active'
from auth.users u on conflict (id) do nothing;
