import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply({ error: 'Sign in to continue.' }, 401);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    if (identityError || !identity.user)
      return reply({ error: 'Your session has expired. Sign in again.' }, 401);
    const { data: actor, error: actorError } = await admin
      .from('profiles')
      .select('id,name,role')
      .eq('id', identity.user.id)
      .maybeSingle();
    if (actorError || actor?.role !== 'ADMIN')
      return reply({ error: 'Administrator access is required.' }, 403);
    const text = await request.text();
    if (text.length > 5000) return reply({ error: 'Request is too large.' }, 413);
    const input = JSON.parse(text);
    if (input.action === 'list') {
      // Admin-only: return the actual login email, which may differ from an older directory entry.
      const { data: profiles, error } = await admin
        .from('profiles')
        .select('id,name,role,agent_id,permissions,login_enabled,access_version')
        .not('agent_id', 'is', null)
        .order('id');
      if (error) throw error;
      const accounts = [];
      for (const profile of profiles || []) {
        const { data, error: authError } = await admin.auth.admin.getUserById(profile.id);
        if (authError)
          return reply(
            { error: 'The account list could not be verified. Retry before changing credentials.' },
            503,
          );
        accounts.push({ ...profile, email: data.user.email });
      }
      return reply({ success: true, accounts });
    }
    if (!['create', 'resetPassword'].includes(input.action) || typeof input.agentId !== 'string')
      return reply({ error: 'Choose a valid account action.' }, 400);
    if (
      typeof input.password !== 'string' ||
      input.password.length < 12 ||
      input.password.length > 128
    )
      return reply({ error: 'Use a password between 12 and 128 characters.' }, 400);
    const { data: agent, error: agentError } = await admin
      .from('agents')
      .select('id,name,email,status')
      .eq('id', input.agentId)
      .maybeSingle();
    if (agentError || !agent) return reply({ error: 'Agent was not found.' }, 404);
    if (agent.status !== 'ACTIVE')
      return reply({ error: 'Activate the agent before managing their login.' }, 400);
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id,role')
      .eq('agent_id', agent.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (input.action === 'create') {
      if (profile)
        return reply({ error: 'This agent already has a login. Use Reset password.' }, 409);
      const { data, error } = await admin.auth.admin.createUser({
        email: agent.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: agent.name },
      });
      if (error) return reply({ error: error.message }, 400);
      const { error: linkError } = await admin
        .from('profiles')
        .insert({
          id: data.user.id,
          name: agent.name,
          role: 'AGENT',
          agent_id: agent.id,
          permissions: [],
          login_enabled: true,
        });
      if (linkError) {
        const cleanup = await admin.auth.admin.deleteUser(data.user.id);
        return reply(
          {
            error: cleanup.error
              ? 'Account linking failed and cleanup requires administrator support. Do not retry until the unlinked Auth account is removed.'
              : 'Account linking failed. No login was retained; refresh and retry.',
          },
          409,
        );
      }
    } else {
      if (!profile || profile.role !== 'AGENT')
        return reply(
          { error: 'An agent login is required. Administrator passwords cannot be changed here.' },
          403,
        );
      const { error } = await admin.auth.admin.updateUserById(profile.id, {
        password: input.password,
      });
      if (error) return reply({ error: error.message }, 400);
    }
    const { error: auditError } = await admin
      .from('agent_events')
      .insert({
        agent_id: agent.id,
        type: 'UPDATED',
        message:
          input.action === 'create'
            ? 'Created agent login with profile-only access.'
            : 'Administrator reset the agent login password.',
        author: actor.name,
        actor_id: actor.id,
      });
    return reply({
      success: true,
      warning: auditError
        ? 'The account change succeeded, but its audit entry could not be saved. Do not repeat the account change.'
        : null,
    });
  } catch {
    return reply(
      { error: 'Account management failed. Refresh the account list before retrying.' },
      500,
    );
  }
});
