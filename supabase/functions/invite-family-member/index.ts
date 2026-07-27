// @ts-nocheck -- This file runs in Supabase's Deno environment, outside the Expo TypeScript runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return Response.json({ error: 'server configuration incomplete' }, { status: 500, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: 'not authenticated' }, { status: 401, headers: corsHeaders });

  const body = await request.json().catch(() => ({})) as { familyId?: string; email?: string; redirectTo?: string };
  const email = body.email?.trim().toLowerCase();
  if (!body.familyId || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: 'invalid invitation' }, { status: 400, headers: corsHeaders });
  }

  const { data: membership } = await adminClient.from('family_members').select('role').eq('family_id', body.familyId).eq('user_id', authData.user.id).maybeSingle();
  if (membership?.role !== 'owner') return Response.json({ error: 'owner permission required' }, { status: 403, headers: corsHeaders });
  if (email === authData.user.email?.toLowerCase()) return Response.json({ error: 'self invitation is not allowed' }, { status: 400, headers: corsHeaders });

  const { data: existingMember } = await adminClient.from('family_members').select('user_id').eq('family_id', body.familyId).eq('email', email).maybeSingle();
  if (existingMember) return Response.json({ error: 'already a family member' }, { status: 409, headers: corsHeaders });

  const { data: existingInvite } = await adminClient.from('family_invites').select('id, expires_at').eq('family_id', body.familyId).eq('email', email).eq('status', 'pending').maybeSingle();
  let inviteId = existingInvite?.id;
  if (!inviteId) {
    const { data: invite, error: inviteError } = await adminClient.from('family_invites').insert({ family_id: body.familyId, email, invited_by: authData.user.id }).select('id').single();
    if (inviteError) return Response.json({ error: 'invitation could not be created' }, { status: 400, headers: corsHeaders });
    inviteId = invite.id;
  }

  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: body.redirectTo,
    data: { family_invite_id: inviteId },
  });
  const alreadyRegistered = Boolean(inviteResult.error?.message.toLowerCase().includes('already'));
  if (inviteResult.error && !alreadyRegistered) {
    return Response.json({ error: 'invitation email could not be sent' }, { status: 502, headers: corsHeaders });
  }

  return Response.json({ inviteId, delivery: alreadyRegistered ? 'existing-account' : 'email-sent' }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
