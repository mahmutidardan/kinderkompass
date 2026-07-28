-- Requires a Supabase test database with pgTAP and the family-sharing migrations applied.
begin;
select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000401', 'authenticated', 'authenticated', 'owner-invite@test.invalid', '', '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000402', 'authenticated', 'authenticated', 'readonly-invite@test.invalid', '', '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000403', 'authenticated', 'authenticated', 'temporary-invite@test.invalid', '', '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.families(id, owner_user_id, name)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'Einladungsfamilie')
on conflict (id) do nothing;
insert into public.family_members(family_id, user_id, role, email)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'owner', 'owner-invite@test.invalid')
on conflict (family_id, user_id) do nothing;
insert into public.family_states(family_id, state, updated_by)
values ('00000000-0000-0000-0000-000000000501', '{"children":[{"id":"invite-child-a"},{"id":"invite-child-b"}],"temperatures":[{"id":"a","childId":"invite-child-a"},{"id":"b","childId":"invite-child-b"}],"medications":[],"doctorContacts":[],"appointments":[]}'::jsonb, '00000000-0000-0000-0000-000000000401')
on conflict (family_id) do update set state = excluded.state;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000401","email":"owner-invite@test.invalid","role":"authenticated"}', true);
select lives_ok($$select public.create_family_invite('00000000-0000-0000-0000-000000000501', 'readonly-invite@test.invalid', 'read_only', array['invite-child-a'], null)$$, 'owner can create a selected-child read-only invitation');
select is((select count(*) from public.family_invite_children child join public.family_invites invite on invite.id = child.invite_id where invite.email = 'readonly-invite@test.invalid'), 1::bigint, 'invitation stores selected children');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000402', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000402","email":"readonly-invite@test.invalid","role":"authenticated"}', true);
select lives_ok($$select public.accept_family_invite((select id from public.family_invites where email = 'readonly-invite@test.invalid' and status = 'pending'))$$, 'intended recipient can accept once');
select throws_ok($$select public.accept_family_invite((select id from public.family_invites where email = 'readonly-invite@test.invalid'))$$, 'P0001', 'not authorized', 'used invitation cannot be accepted twice');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000501', 'invite-child-a', 'read'), true, 'read-only caregiver can read the selected child');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000501', 'invite-child-b', 'read'), false, 'read-only caregiver cannot read another child');
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000501', 'invite-child-a', 'write'), false, 'read-only caregiver cannot write');
select is(jsonb_array_length(public.get_family_state('00000000-0000-0000-0000-000000000501') -> 'children'), 1, 'normal family-state read is filtered to the selected child');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000401","email":"owner-invite@test.invalid","role":"authenticated"}', true);
select lives_ok($$select public.create_family_invite('00000000-0000-0000-0000-000000000501', 'temporary-invite@test.invalid', 'temporary_guest', null, now() + interval '1 day')$$, 'owner can create a temporary invitation');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000403', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000403","email":"temporary-invite@test.invalid","role":"authenticated"}', true);
select lives_ok($$select public.accept_family_invite((select id from public.family_invites where email = 'temporary-invite@test.invalid' and status = 'pending'))$$, 'temporary recipient can accept');
update public.family_members set access_expires_at = now() - interval '1 second' where family_id = '00000000-0000-0000-0000-000000000501' and user_id = '00000000-0000-0000-0000-000000000403';
select is(private.authorize_family_access('00000000-0000-0000-0000-000000000501', 'invite-child-a', 'read'), false, 'expired temporary access is denied immediately');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);
select throws_ok($$select public.remove_family_member('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401')$$, 'P0001', 'not authorized', 'last owner cannot be removed');
select * from finish();
rollback;
