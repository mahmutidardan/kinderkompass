-- Review follow-up: invitation configuration remains authoritative on resend,
-- and a temporary invitation cannot be accepted after its access window.

alter table public.security_audit_log drop constraint if exists security_audit_log_action_check;
alter table public.security_audit_log add constraint security_audit_log_action_check check (action in (
  'family_created', 'invitation_created', 'invitation_updated', 'invitation_accepted', 'invitation_rejected',
  'invitation_revoked', 'member_removed', 'member_access_changed', 'child_profiles_changed'
));

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
  invite_expires_at timestamptz;
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

  invite_expires_at := least(now() + interval '7 days', coalesce(target_access_expires_at, now() + interval '7 days'));
  update public.family_invites set status = 'revoked', revoked_at = now()
  where family_id = target_family_id and lower(email) = normalized_email and status = 'pending' and expires_at <= now();

  select id into result_invite_id from public.family_invites
  where family_id = target_family_id and lower(email) = normalized_email and status = 'pending' and expires_at > now()
  for update;

  if result_invite_id is null then
    insert into public.family_invites(family_id, email, role, invited_by, expires_at, access_expires_at)
    values (target_family_id, normalized_email, normalized_role, (select auth.uid()), invite_expires_at, target_access_expires_at)
    returning id into result_invite_id;
    perform private.write_security_audit(target_family_id, 'invitation_created', 'family_invite', result_invite_id::text);
  else
    update public.family_invites
    set role = normalized_role, expires_at = invite_expires_at, access_expires_at = target_access_expires_at
    where id = result_invite_id;
    delete from public.family_invite_children where invite_id = result_invite_id;
    perform private.write_security_audit(target_family_id, 'invitation_updated', 'family_invite', result_invite_id::text);
  end if;

  if not all_children_value then
    insert into public.family_invite_children(invite_id, child_id)
    select distinct result_invite_id, unnest(target_child_ids);
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
  where id = invite_id and status = 'pending' and expires_at > now()
    and (access_expires_at is null or access_expires_at > now())
  for update;
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

grant execute on function public.create_family_invite(uuid, text, text, text[], timestamptz) to authenticated;
grant execute on function public.create_family_invite(uuid, text) to authenticated;
grant execute on function public.accept_family_invite(uuid) to authenticated;
