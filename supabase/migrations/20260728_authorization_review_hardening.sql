drop policy if exists "Owners can remove guests and guests can leave" on public.family_members;
drop policy if exists "Owners can update invitations" on public.family_invites;

create table if not exists public.family_invitation_rate_limits (
  family_id uuid not null references public.families(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (family_id, actor_user_id)
);

alter table public.family_invitation_rate_limits enable row level security;

create or replace function private.consume_family_invitation_quota(target_family_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_count integer;
begin
  insert into public.family_invitation_rate_limits(family_id, actor_user_id, window_started_at, request_count, updated_at)
  values (target_family_id, (select auth.uid()), now(), 1, now())
  on conflict (family_id, actor_user_id) do update
  set window_started_at = case
        when public.family_invitation_rate_limits.window_started_at <= now() - interval '1 hour' then now()
        else public.family_invitation_rate_limits.window_started_at
      end,
      request_count = case
        when public.family_invitation_rate_limits.window_started_at <= now() - interval '1 hour' then 1
        else public.family_invitation_rate_limits.request_count + 1
      end,
      updated_at = now()
  where public.family_invitation_rate_limits.window_started_at <= now() - interval '1 hour'
    or public.family_invitation_rate_limits.request_count < 5
  returning request_count into next_count;

  if next_count is null then raise exception 'rate limited'; end if;
end;
$$;

create or replace function public.create_family_invite(target_family_id uuid, target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  normalized_email text := lower(trim(target_email));
  result_invite_id uuid;
  created_invite boolean := false;
begin
  if not private.authorize_family_access(target_family_id, null, 'manage')
    or normalized_email = ''
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or normalized_email = current_email
  then
    raise exception 'not authorized';
  end if;

  perform private.consume_family_invitation_quota(target_family_id);

  if exists (
    select 1 from public.family_members
    where family_id = target_family_id and lower(email) = normalized_email
  ) then raise exception 'not authorized'; end if;

  select id into result_invite_id
  from public.family_invites
  where family_id = target_family_id and lower(email) = normalized_email and status = 'pending';

  if result_invite_id is null then
    insert into public.family_invites(family_id, email, invited_by)
    values (target_family_id, normalized_email, (select auth.uid()))
    on conflict do nothing
    returning id into result_invite_id;
    created_invite := result_invite_id is not null;

    if result_invite_id is null then
      select id into result_invite_id
      from public.family_invites
      where family_id = target_family_id and lower(email) = normalized_email and status = 'pending';
    end if;
  end if;

  if result_invite_id is null then raise exception 'not authorized'; end if;

  if created_invite then
    perform private.write_security_audit(target_family_id, 'invitation_created', 'family_invite', result_invite_id::text);
  end if;

  return result_invite_id;
end;
$$;

grant execute on function public.create_family_invite(uuid, text) to authenticated;

create or replace function public.leave_family(target_family_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or not exists (
      select 1 from public.family_members
      where family_id = target_family_id and user_id = current_user_id and role = 'guest'
    )
  then raise exception 'not authorized'; end if;

  perform private.write_security_audit(target_family_id, 'member_removed', 'family_member', current_user_id::text);
  delete from public.family_members
  where family_id = target_family_id and user_id = current_user_id and role = 'guest';
end;
$$;

grant execute on function public.leave_family(uuid) to authenticated;
