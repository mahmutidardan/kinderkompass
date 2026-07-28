-- Requires a Supabase test database with the pgTAP extension enabled.
-- The transaction keeps all fixture users, families and audit rows isolated.
begin;

select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'owner@test.invalid', '', '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'caregiver@test.invalid', '', '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'other@test.invalid', '', '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.families(id, owner_user_id, name)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Testfamilie A'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'Testfamilie B')
on conflict (id) do nothing;

insert into public.family_members(family_id, user_id, role, email)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'owner', 'owner@test.invalid'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'guest', 'caregiver@test.invalid'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'owner', 'other@test.invalid')
on conflict (family_id, user_id) do nothing;

insert into public.family_states(family_id, state, updated_by)
values (
  '00000000-0000-0000-0000-000000000201',
  '{"children":[{"id":"child-a-1"}],"temperatures":[{"childId":"child-a-1"}],"medications":[],"doctorContacts":[],"appointments":[]}'::jsonb,
  '00000000-0000-0000-0000-000000000101'
)
on conflict (family_id) do update set state = excluded.state;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', 'child-a-1', 'read'), true, 'owner can read an authorized child');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', null, 'manage'), true, 'owner can manage the family');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', 'child-a-1', 'read'), true, 'authorized caregiver can read the child');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', 'child-a-1', 'write'), true, 'authorized caregiver can write shared entries');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', null, 'manage'), false, 'caregiver cannot manage the family');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', 'child-not-in-family', 'read'), false, 'caregiver cannot read another child');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000202', null, 'read'), false, 'caregiver cannot cross family boundaries');

select set_config('request.jwt.claim.sub', '', true);
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', null, 'read'), false, 'unauthenticated access is denied');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(private.validate_family_state_scope('{"children":[{"id":"child-a-1"}],"temperatures":[{"childId":"child-other"}],"medications":[],"doctorContacts":[],"appointments":[]}'::jsonb), false, 'manipulated child IDs are rejected');
select is(private.validate_family_state_scope('{"children":[{"id":"child-a-1"}],"temperatures":[],"medications":[],"doctorContacts":[],"appointments":[],"illnessCases":[{"childId":"child-other"}]}'::jsonb), false, 'illness cases cannot reference another child');
select lives_ok($$select public.update_family_state('00000000-0000-0000-0000-000000000201', '{"children":[{"id":"child-a-1"},{"id":"child-a-2"}],"temperatures":[{"childId":"child-a-1"}],"medications":[],"doctorContacts":[],"appointments":[]}'::jsonb)$$, 'owner can write a valid scoped state');
select is((select count(*) from public.security_audit_log where family_id = '00000000-0000-0000-0000-000000000201' and action = 'child_profiles_changed'), 1::bigint, 'child profile changes create a minimal audit entry');
select lives_ok($$select public.create_family_invite('00000000-0000-0000-0000-000000000201', 'invited@test.invalid')$$, 'owner can atomically create an invitation');
select is((select count(*) from public.security_audit_log where family_id = '00000000-0000-0000-0000-000000000201' and action = 'invitation_created'), 1::bigint, 'invitation creation is audited in the same transaction');
insert into public.family_invitation_rate_limits(family_id, actor_user_id, window_started_at, request_count)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', now(), 5)
on conflict (family_id, actor_user_id) do update set window_started_at = excluded.window_started_at, request_count = excluded.request_count;
select throws_ok($$select public.create_family_invite('00000000-0000-0000-0000-000000000201', 'throttled@test.invalid')$$, 'P0001', 'rate limited', 'owner is rate limited after five invitation attempts per hour');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select throws_ok($$select public.update_family_state('00000000-0000-0000-0000-000000000201', '{"children":[{"id":"child-a-1"},{"id":"child-a-2"},{"id":"child-a-3"}],"temperatures":[{"childId":"child-a-1"}],"medications":[],"doctorContacts":[],"appointments":[]}'::jsonb)$$, 'P0001', 'not authorized', 'caregiver cannot mutate child profiles');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select throws_ok($$select public.get_family_state('00000000-0000-0000-0000-000000000202')$$, 'P0001', 'not authorized', 'owner cannot read another family');

delete from public.family_members
where family_id = '00000000-0000-0000-0000-000000000201'
  and user_id = '00000000-0000-0000-0000-000000000102';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000201', 'child-a-1', 'read'), false, 'revoked membership loses access immediately');

select * from finish();
rollback;
