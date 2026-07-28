-- Ticket 2: explicit caregiver roles, invitation lifecycle and child-scoped access.
-- Existing owners and guests remain valid; legacy guests keep write access.

alter table public.family_members
  add column if not exists all_children boolean not null default true,
  add column if not exists access_expires_at timestamptz;

alter table public.family_invites
  add column if not exists access_expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table public.family_members drop constraint if exists family_members_role_check;
alter table public.family_members add constraint family_members_role_check
  check (role in ('owner', 'guest', 'caregiver', 'read_only', 'temporary_guest'));

alter table public.family_invites drop constraint if exists family_invites_role_check;
alter table public.family_invites add constraint family_invites_role_check
  check (role in ('owner', 'guest', 'caregiver', 'read_only', 'temporary_guest'));

alter table public.family_invites drop constraint if exists family_invites_status_check;
alter table public.family_invites add constraint family_invites_status_check
  check (status in ('pending', 'accepted', 'rejected', 'revoked'));

create table if not exists public.family_member_children (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id text not null,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id, child_id),
  foreign key (family_id, user_id) references public.family_members(family_id, user_id) on delete cascade
);

create table if not exists public.family_invite_children (
  invite_id uuid not null references public.family_invites(id) on delete cascade,
  child_id text not null,
  primary key (invite_id, child_id)
);

create index if not exists family_member_children_scope_idx
  on public.family_member_children(family_id, user_id, child_id);

alter table public.family_member_children enable row level security;
alter table public.family_invite_children enable row level security;

create policy "Family members can view member child scopes"
on public.family_member_children for select to authenticated
using (private.is_family_member(family_id));

create policy "Owners and invitees can view invitation child scopes"
on public.family_invite_children for select to authenticated
using (
  exists (
    select 1 from public.family_invites invite
    where invite.id = invite_id
      and (private.is_family_owner(invite.family_id)
        or lower(invite.email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  )
);

alter table public.security_audit_log drop constraint if exists security_audit_log_action_check;
alter table public.security_audit_log add constraint security_audit_log_action_check check (action in (
  'family_created', 'invitation_created', 'invitation_accepted', 'invitation_rejected',
  'invitation_revoked', 'member_removed', 'member_access_changed', 'child_profiles_changed'
));

create or replace function private.authorize_family_access(
  target_family_id uuid,
  target_child_id text default null,
  required_operation text default 'read'
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership public.family_members%rowtype;
  child_is_known boolean;
  child_is_allowed boolean;
begin
  if (select auth.uid()) is null or target_family_id is null then return false; end if;

  select * into membership
  from public.family_members
  where family_id = target_family_id and user_id = (select auth.uid());

  if membership.user_id is null
    or (membership.access_expires_at is not null and membership.access_expires_at <= now())
  then return false; end if;

  if target_child_id is not null then
    select exists (
      select 1 from public.family_states state_row
      cross join lateral jsonb_array_elements(coalesce(state_row.state -> 'children', '[]'::jsonb)) as child(value)
      where state_row.family_id = target_family_id and child.value ->> 'id' = target_child_id
    ) into child_is_known;
    if not child_is_known then return false; end if;

    child_is_allowed := membership.all_children
      or exists (
        select 1 from public.family_member_children
        where family_id = target_family_id and user_id = membership.user_id and child_id = target_child_id
      );
    if not child_is_allowed then return false; end if;
  end if;

  if required_operation = 'read' then return true; end if;
  if required_operation = 'write' then return membership.role in ('owner', 'guest', 'caregiver', 'temporary_guest'); end if;
  if required_operation = 'manage' then return membership.role = 'owner'; end if;
  return false;
end;
$$;

create or replace function private.can_read_full_family_state(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.authorize_family_access(target_family_id, null, 'read')
    and exists (
      select 1 from public.family_members
      where family_id = target_family_id
        and user_id = (select auth.uid())
        and all_children
        and (access_expires_at is null or access_expires_at > now())
    );
$$;

drop policy if exists "Family members can view shared state" on public.family_states;
drop policy if exists "Owners can create shared state" on public.family_states;
drop policy if exists "Owners can update shared state" on public.family_states;
create policy "Full-scope members can view shared state"
on public.family_states for select to authenticated
using (private.can_read_full_family_state(family_id));

create or replace function private.filter_family_state_for_member(
  target_family_id uuid,
  source_state jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership public.family_members%rowtype;
  permitted_child_ids text[];
  result_state jsonb := coalesce(source_state, '{}'::jsonb);
  field_name text;
begin
  select * into membership from public.family_members
  where family_id = target_family_id and user_id = (select auth.uid());
  if membership.user_id is null or membership.all_children then return result_state; end if;

  select coalesce(array_agg(child_id), array[]::text[]) into permitted_child_ids
  from public.family_member_children
  where family_id = target_family_id and user_id = membership.user_id;

  result_state := result_state - 'medicationInventory';
  foreach field_name in array array['children', 'temperatures', 'medications', 'doctorContacts', 'appointments'] loop
    result_state := jsonb_set(result_state, array[field_name], coalesce((
      select jsonb_agg(item.value)
      from jsonb_array_elements(coalesce(source_state -> field_name, '[]'::jsonb)) as item(value)
      where item.value ->> 'id' = any(permitted_child_ids)
         or item.value ->> 'childId' = any(permitted_child_ids)
    ), '[]'::jsonb));
  end loop;

  if not exists (
    select 1 from jsonb_array_elements(coalesce(result_state -> 'children', '[]'::jsonb)) child(value)
    where child.value ->> 'id' = result_state ->> 'activeChildId'
  ) then
    result_state := jsonb_set(result_state, '{activeChildId}', to_jsonb((
      select child.value ->> 'id'
      from jsonb_array_elements(coalesce(result_state -> 'children', '[]'::jsonb)) child(value)
      limit 1
    )), true);
  end if;
  return result_state;
end;
$$;

create or replace function public.get_family_state(target_family_id uuid, target_child_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result_state jsonb;
begin
  if not private.authorize_family_access(target_family_id, target_child_id, 'read') then raise exception 'not authorized'; end if;
  select state into result_state from public.family_states where family_id = target_family_id;
  return private.filter_family_state_for_member(target_family_id, result_state);
end;
$$;

create or replace function private.validate_member_child_ids(target_family_id uuid, selected_child_ids text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_length(selected_child_ids, 1), 0) > 0
    and not exists (
      select 1 from unnest(selected_child_ids) selected(child_id)
      where nullif(selected.child_id, '') is null
        or not exists (
          select 1 from public.family_states family_state
          cross join lateral jsonb_array_elements(coalesce(family_state.state -> 'children', '[]'::jsonb)) child(value)
          where family_state.family_id = target_family_id and child.value ->> 'id' = selected.child_id
        )
    );
$$;

create or replace function private.merge_scoped_family_state(
  target_family_id uuid,
  previous_state jsonb,
  next_state jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership public.family_members%rowtype;
  permitted_child_ids text[];
  result_state jsonb := coalesce(previous_state, '{}'::jsonb) || coalesce(next_state, '{}'::jsonb);
  field_name text;
begin
  select * into membership from public.family_members
  where family_id = target_family_id and user_id = (select auth.uid());
  if membership.all_children then return result_state; end if;
  select coalesce(array_agg(child_id), array[]::text[]) into permitted_child_ids
  from public.family_member_children where family_id = target_family_id and user_id = membership.user_id;

  result_state := jsonb_set(result_state, '{children}', coalesce(previous_state -> 'children', '[]'::jsonb));
  foreach field_name in array array['temperatures', 'medications', 'doctorContacts', 'appointments'] loop
    result_state := jsonb_set(result_state, array[field_name], coalesce((
      select jsonb_agg(value)
      from (
        select item.value
        from jsonb_array_elements(coalesce(previous_state -> field_name, '[]'::jsonb)) item(value)
        where coalesce(item.value ->> 'childId', '') <> all(permitted_child_ids)
        union all
        select item.value from jsonb_array_elements(coalesce(next_state -> field_name, '[]'::jsonb)) item(value)
      ) merged
    ), '[]'::jsonb));
  end loop;
  return result_state;
end;
$$;

create or replace function public.update_family_state(target_family_id uuid, next_state jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.family_members%rowtype;
  previous_state jsonb;
  final_state jsonb;
  child_id text;
  children_changed boolean;
begin
  if not private.authorize_family_access(target_family_id, null, 'write')
    or not private.validate_family_state_scope(next_state)
  then raise exception 'not authorized'; end if;

  select * into membership from public.family_members
  where family_id = target_family_id and user_id = (select auth.uid());
  select state into previous_state from public.family_states where family_id = target_family_id for update;

  if not membership.all_children then
    foreach child_id in array array(
      select distinct coalesce(value ->> 'id', value ->> 'childId')
      from (
        select value from jsonb_array_elements(coalesce(next_state -> 'children', '[]'::jsonb))
        union all select value from jsonb_array_elements(coalesce(next_state -> 'temperatures', '[]'::jsonb))
        union all select value from jsonb_array_elements(coalesce(next_state -> 'medications', '[]'::jsonb))
        union all select value from jsonb_array_elements(coalesce(next_state -> 'doctorContacts', '[]'::jsonb))
        union all select value from jsonb_array_elements(coalesce(next_state -> 'appointments', '[]'::jsonb))
      ) entries(value)
    ) loop
      if child_id is null or not private.authorize_family_access(target_family_id, child_id, 'write') then raise exception 'not authorized'; end if;
    end loop;
  end if;

  children_changed := coalesce(previous_state -> 'children', '[]'::jsonb) is distinct from coalesce(next_state -> 'children', '[]'::jsonb);
  if membership.role <> 'owner' and membership.all_children and children_changed then raise exception 'not authorized'; end if;
  if not membership.all_children and children_changed then
    if coalesce(next_state -> 'children', '[]'::jsonb) is distinct from private.filter_family_state_for_member(target_family_id, previous_state) -> 'children' then raise exception 'not authorized'; end if;
  end if;

  final_state := private.merge_scoped_family_state(target_family_id, previous_state, next_state);
  insert into public.family_states(family_id, state, updated_at, updated_by)
  values (target_family_id, final_state, now(), (select auth.uid()))
  on conflict (family_id) do update set state = excluded.state, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  if membership.role = 'owner' and children_changed then perform private.write_security_audit(target_family_id, 'child_profiles_changed', 'family_state'); end if;
end;
$$;

-- Keep the two-argument RPC backwards-compatible while the Edge Function uses the explicit role overload.
create or replace function public.create_family_invite(
  target_family_id uuid,
  target_email text,
  target_role text,
  target_child_ids text[],
  target_access_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  normalized_email text := lower(trim(target_email));
  normalized_role text := coalesce(nullif(trim(target_role), ''), 'caregiver');
  result_invite_id uuid;
  all_children_value boolean := coalesce(array_length(target_child_ids, 1), 0) = 0;
begin
  if not private.authorize_family_access(target_family_id, null, 'manage')
    or normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or normalized_email = current_email
    or normalized_role not in ('owner', 'guest', 'caregiver', 'read_only', 'temporary_guest')
    or (normalized_role = 'temporary_guest' and (target_access_expires_at is null or target_access_expires_at <= now()))
    or (normalized_role <> 'temporary_guest' and target_access_expires_at is not null)
    or (not all_children_value and not private.validate_member_child_ids(target_family_id, target_child_ids))
  then raise exception 'not authorized'; end if;

  perform private.consume_family_invitation_quota(target_family_id);
  if exists (select 1 from public.family_members where family_id = target_family_id and lower(email) = normalized_email) then raise exception 'not authorized'; end if;

  update public.family_invites set status = 'revoked', revoked_at = now()
  where family_id = target_family_id and lower(email) = normalized_email and status = 'pending' and expires_at <= now();

  select id into result_invite_id from public.family_invites
  where family_id = target_family_id and lower(email) = normalized_email and status = 'pending' and expires_at > now()
  for update;
  if result_invite_id is null then
    insert into public.family_invites(family_id, email, role, invited_by, access_expires_at)
    values (target_family_id, normalized_email, normalized_role, (select auth.uid()), target_access_expires_at)
    returning id into result_invite_id;
    if not all_children_value then
      insert into public.family_invite_children(invite_id, child_id)
      select result_invite_id, unnest(target_child_ids);
    end if;
    perform private.write_security_audit(target_family_id, 'invitation_created', 'family_invite', result_invite_id::text);
  end if;
  return result_invite_id;
end;
$$;

create or replace function public.create_family_invite(target_family_id uuid, target_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$ select public.create_family_invite(target_family_id, target_email, 'caregiver', null, null); $$;

create or replace function public.accept_family_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  current_name text := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name');
  target_invite public.family_invites%rowtype;
  invite_children text[];
  all_children_value boolean;
begin
  if current_user_id is null or current_email = '' then raise exception 'not authorized'; end if;
  select * into target_invite from public.family_invites
  where id = invite_id and status = 'pending' and expires_at > now() for update;
  if target_invite.id is null or lower(target_invite.email) <> current_email then raise exception 'not authorized'; end if;
  select coalesce(array_agg(child_id), array[]::text[]) into invite_children from public.family_invite_children where invite_id = target_invite.id;
  all_children_value := coalesce(array_length(invite_children, 1), 0) = 0;
  insert into public.family_members(family_id, user_id, role, email, display_name, all_children, access_expires_at)
  values (target_invite.family_id, current_user_id, target_invite.role, current_email, current_name, all_children_value, target_invite.access_expires_at)
  on conflict (family_id, user_id) do nothing;
  if not all_children_value then
    insert into public.family_member_children(family_id, user_id, child_id)
    select target_invite.family_id, current_user_id, unnest(invite_children)
    on conflict do nothing;
  end if;
  update public.family_invites set status = 'accepted', accepted_by = current_user_id, accepted_at = now() where id = target_invite.id;
  perform private.write_security_audit(target_invite.family_id, 'invitation_accepted', 'family_invite', target_invite.id::text);
  return target_invite.family_id;
end;
$$;

create or replace function public.reject_family_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_invite public.family_invites%rowtype;
begin
  select * into target_invite from public.family_invites
  where id = target_invite_id and status = 'pending' for update;
  if target_invite.id is null or lower(target_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'not authorized'; end if;
  update public.family_invites set status = 'rejected', rejected_at = now() where id = target_invite.id;
  perform private.write_security_audit(target_invite.family_id, 'invitation_rejected', 'family_invite', target_invite.id::text);
end;
$$;

create or replace function public.revoke_family_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_family_id uuid;
begin
  select family_id into target_family_id from public.family_invites where id = target_invite_id and status = 'pending';
  if target_family_id is null or not private.authorize_family_access(target_family_id, null, 'manage') then raise exception 'not authorized'; end if;
  update public.family_invites set status = 'revoked', revoked_at = now() where id = target_invite_id;
  perform private.write_security_audit(target_family_id, 'invitation_revoked', 'family_invite', target_invite_id::text);
end;
$$;

create or replace function public.update_family_member_access(
  target_family_id uuid,
  target_user_id uuid,
  target_role text,
  target_child_ids text[],
  target_access_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_member public.family_members%rowtype;
declare all_children_value boolean := coalesce(array_length(target_child_ids, 1), 0) = 0;
begin
  if not private.authorize_family_access(target_family_id, null, 'manage')
    or target_role not in ('owner', 'guest', 'caregiver', 'read_only', 'temporary_guest')
    or (target_role = 'temporary_guest' and (target_access_expires_at is null or target_access_expires_at <= now()))
    or (target_role <> 'temporary_guest' and target_access_expires_at is not null)
    or (not all_children_value and not private.validate_member_child_ids(target_family_id, target_child_ids))
  then raise exception 'not authorized'; end if;
  select * into target_member from public.family_members where family_id = target_family_id and user_id = target_user_id for update;
  if target_member.user_id is null then raise exception 'not authorized'; end if;
  if target_role = 'owner' then all_children_value := true; end if;
  if target_member.role = 'owner' and target_role <> 'owner'
    and not exists (select 1 from public.family_members where family_id = target_family_id and role = 'owner' and user_id <> target_user_id)
  then raise exception 'not authorized'; end if;
  update public.family_members set role = target_role, all_children = all_children_value,
    access_expires_at = case when target_role = 'temporary_guest' then target_access_expires_at else null end
  where family_id = target_family_id and user_id = target_user_id;
  delete from public.family_member_children where family_id = target_family_id and user_id = target_user_id;
  if not all_children_value then
    insert into public.family_member_children(family_id, user_id, child_id)
    select target_family_id, target_user_id, unnest(target_child_ids);
  end if;
  if target_member.role = 'owner' and target_role <> 'owner' and exists (select 1 from public.families where id = target_family_id and owner_user_id = target_user_id) then
    update public.families set owner_user_id = (select user_id from public.family_members where family_id = target_family_id and role = 'owner' and user_id <> target_user_id limit 1) where id = target_family_id;
  end if;
  perform private.write_security_audit(target_family_id, 'member_access_changed', 'family_member', target_user_id::text);
end;
$$;

create or replace function public.remove_family_member(target_family_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_member public.family_members%rowtype;
declare next_owner uuid;
begin
  if not private.authorize_family_access(target_family_id, null, 'manage') then raise exception 'not authorized'; end if;
  select * into target_member from public.family_members where family_id = target_family_id and user_id = target_user_id for update;
  if target_member.user_id is null then raise exception 'not authorized'; end if;
  if target_member.role = 'owner' then
    select user_id into next_owner from public.family_members where family_id = target_family_id and role = 'owner' and user_id <> target_user_id limit 1;
    if next_owner is null then raise exception 'not authorized'; end if;
    update public.families set owner_user_id = next_owner where id = target_family_id and owner_user_id = target_user_id;
  end if;
  delete from public.family_members where family_id = target_family_id and user_id = target_user_id;
  perform private.write_security_audit(target_family_id, 'member_removed', 'family_member', target_user_id::text);
end;
$$;

grant execute on function public.create_family_invite(uuid, text, text, text[], timestamptz) to authenticated;
grant execute on function public.create_family_invite(uuid, text) to authenticated;
grant execute on function public.accept_family_invite(uuid) to authenticated;
grant execute on function public.reject_family_invite(uuid) to authenticated;
grant execute on function public.revoke_family_invite(uuid) to authenticated;
grant execute on function public.update_family_member_access(uuid, uuid, text, text[], timestamptz) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
