create schema if not exists private;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Meine Familie',
  created_at timestamptz not null default now()
);

create unique index if not exists families_owner_user_id_key on public.families(owner_user_id);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'guest')),
  email text not null,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role text not null default 'guest' check (role = 'guest'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists family_invites_one_pending_email
on public.family_invites(family_id, lower(email)) where status = 'pending';

create table if not exists public.family_states (
  family_id uuid primary key references public.families(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_family_owner(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.is_family_owner(uuid) to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_states enable row level security;

create policy "Family members can view their family"
on public.families for select to authenticated
using (private.is_family_member(id));

create policy "Owners can update their family"
on public.families for update to authenticated
using (private.is_family_owner(id))
with check (private.is_family_owner(id));

create policy "Family members can view members"
on public.family_members for select to authenticated
using (private.is_family_member(family_id));

create policy "Owners can remove guests and guests can leave"
on public.family_members for delete to authenticated
using (
  (private.is_family_owner(family_id) and role = 'guest')
  or (user_id = (select auth.uid()) and role = 'guest')
);

create policy "Owners and invitees can view invitations"
on public.family_invites for select to authenticated
using (
  private.is_family_owner(family_id)
  or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "Owners can update invitations"
on public.family_invites for update to authenticated
using (private.is_family_owner(family_id))
with check (private.is_family_owner(family_id));

create policy "Family members can view shared state"
on public.family_states for select to authenticated
using (private.is_family_member(family_id));

create policy "Owners can create shared state"
on public.family_states for insert to authenticated
with check (private.is_family_owner(family_id) and updated_by = (select auth.uid()));

create policy "Owners can update shared state"
on public.family_states for update to authenticated
using (private.is_family_owner(family_id))
with check (private.is_family_owner(family_id) and updated_by = (select auth.uid()));

create or replace function public.ensure_personal_family(requested_name text default 'Meine Familie')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := coalesce(auth.jwt() ->> 'email', '');
  current_name text := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name');
  result_family_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  select id into result_family_id from public.families where owner_user_id = current_user_id limit 1;
  if result_family_id is null then
    insert into public.families(owner_user_id, name)
    values (current_user_id, coalesce(nullif(trim(requested_name), ''), 'Meine Familie'))
    returning id into result_family_id;
  end if;

  insert into public.family_members(family_id, user_id, role, email, display_name)
  values (result_family_id, current_user_id, 'owner', current_email, current_name)
  on conflict (family_id, user_id) do update set email = excluded.email, display_name = excluded.display_name;

  insert into public.family_states(family_id, state, updated_by)
  select result_family_id, coalesce(us.state, '{}'::jsonb), current_user_id
  from (select 1) seed
  left join public.user_states us on us.user_id = current_user_id
  on conflict (family_id) do nothing;

  return result_family_id;
end;
$$;

grant execute on function public.ensure_personal_family(text) to authenticated;

create or replace function public.accept_family_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_invite public.family_invites%rowtype;
  current_name text := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name');
begin
  if current_user_id is null or current_email = '' then raise exception 'authentication required'; end if;

  select * into target_invite
  from public.family_invites
  where id = invite_id and status = 'pending' and expires_at > now()
  for update;

  if target_invite.id is null or lower(target_invite.email) <> current_email then
    raise exception 'invitation not available';
  end if;

  insert into public.family_members(family_id, user_id, role, email, display_name)
  values (target_invite.family_id, current_user_id, 'guest', current_email, current_name)
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
  set status = 'accepted', accepted_by = current_user_id
  where id = invite_id;

  return target_invite.family_id;
end;
$$;

grant execute on function public.accept_family_invite(uuid) to authenticated;

create or replace function public.update_family_state(target_family_id uuid, next_state jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text;
  previous_state jsonb;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if next_state is null or jsonb_typeof(next_state) <> 'object' then raise exception 'invalid family state'; end if;

  select role into current_role
  from public.family_members
  where family_id = target_family_id and user_id = current_user_id;

  if current_role is null then raise exception 'family membership required'; end if;

  select state into previous_state
  from public.family_states
  where family_id = target_family_id
  for update;

  if current_role = 'guest'
    and coalesce(previous_state -> 'children', '[]'::jsonb)
      is distinct from coalesce(next_state -> 'children', '[]'::jsonb)
  then
    raise exception 'guests cannot change child profiles';
  end if;

  insert into public.family_states(family_id, state, updated_at, updated_by)
  values (target_family_id, next_state, now(), current_user_id)
  on conflict (family_id) do update
  set state = excluded.state, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$$;

grant execute on function public.update_family_state(uuid, jsonb) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.family_states;
exception
  when duplicate_object then null;
end $$;
