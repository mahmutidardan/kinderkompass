-- Illness cases remain part of the backward-compatible family JSON state.
-- Validate their child scope before a shared state can be written.
create or replace function private.validate_family_state_scope(next_state jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare field_name text;
begin
  if next_state is null or jsonb_typeof(next_state) <> 'object' then return false; end if;
  foreach field_name in array array['children', 'temperatures', 'medications', 'doctorContacts', 'appointments', 'illnessCases'] loop
    if jsonb_typeof(coalesce(next_state -> field_name, '[]'::jsonb)) <> 'array' then return false; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(coalesce(next_state -> 'children', '[]'::jsonb)) child(value) where nullif(child.value ->> 'id', '') is null) then return false; end if;
  if nullif(next_state ->> 'activeChildId', '') is not null and not exists (select 1 from jsonb_array_elements(coalesce(next_state -> 'children', '[]'::jsonb)) child(value) where child.value ->> 'id' = next_state ->> 'activeChildId') then return false; end if;
  return not exists (
    select 1 from (
      select value ->> 'childId' child_id from jsonb_array_elements(coalesce(next_state -> 'temperatures', '[]'::jsonb)) value
      union all select value ->> 'childId' from jsonb_array_elements(coalesce(next_state -> 'medications', '[]'::jsonb)) value
      union all select value ->> 'childId' from jsonb_array_elements(coalesce(next_state -> 'doctorContacts', '[]'::jsonb)) value
      union all select value ->> 'childId' from jsonb_array_elements(coalesce(next_state -> 'appointments', '[]'::jsonb)) value
      union all select value ->> 'childId' from jsonb_array_elements(coalesce(next_state -> 'illnessCases', '[]'::jsonb)) value
    ) references where nullif(child_id, '') is null or not exists (
      select 1 from jsonb_array_elements(coalesce(next_state -> 'children', '[]'::jsonb)) child(value) where child.value ->> 'id' = references.child_id
    )
  );
end;
$$;
