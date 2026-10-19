import { requireSupabase, backendError, isSupabase } from './supabase/client';

export const accountService = {
  async list() {
    if (!isSupabase) return [];
    return (await this.request({ action: 'list' })).accounts;
  },
  async request(body) {
    if (!isSupabase) throw new Error('Login management requires the connected Supabase workspace.');
    const { data, error } = await requireSupabase().functions.invoke('agent-accounts', { body });
    if (error) {
      let message = error.message;
      try {
        message = (await error.context.json()).error || message;
      } catch {
        /* Network errors have no response. */
      }
      throw new Error(message);
    }
    if (!data?.success)
      throw new Error(
        data?.error || 'The account change could not be confirmed. Refresh before retrying.',
      );
    return data;
  },
  async credentials(action, agentId, password) {
    return this.request({ action, agentId, password });
  },
  async setAccess(agentId, permissions, enabled, version) {
    const { error } = await requireSupabase().rpc('set_agent_access', {
      target_agent: agentId,
      granted_permissions: permissions,
      login_enabled: enabled,
      expected_version: version,
    });
    if (error) throw backendError(error);
  },
};
