import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectWorkspace } from '../store';
import {
  AGENT_PRIVILEGES,
  ALL_AGENT_PERMISSIONS,
  dependenciesFor,
  normalizePermissions,
} from '../permissions';
import { accountService } from '../../../services/accountService';
import { isSupabase } from '../../../services/supabase/client';
import { useToast } from '../../../components/ui';
import { Button, Field, FormDialog, PageHeading, Panel, Badge, DataTable } from '../components/UI';

function AccessDialog({ agent, account, onClose, onSaved }) {
  const [selected, setSelected] = useState(account.permissions || []);
  return (
    <FormDialog
      title={`Access for ${agent.name}`}
      onClose={onClose}
      submitLabel="Save permissions"
      onSubmit={async (fields) => {
        await accountService.setAccess(
          agent.id,
          selected,
          fields.enabled === 'on',
          account.access_version,
        );
        onSaved('Agent permissions updated.');
      }}
    >
      <p className="crm-full">
        Own profile, profile editing and password change are always available to enabled agents. All
        customer data remains limited to assigned leads.
      </p>
      <label className="crm-check">
        <input type="checkbox" name="enabled" defaultChecked={account.login_enabled} /> Login
        enabled
      </label>
      <div className="crm-actions crm-full">
        <Button secondary onClick={() => setSelected([])}>
          Profile only
        </Button>
        <Button secondary onClick={() => setSelected([...ALL_AGENT_PERMISSIONS])}>
          All agent permissions
        </Button>
      </div>
      {AGENT_PRIVILEGES.map(([key, name, description]) => (
        <label className="crm-check" key={key}>
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? normalizePermissions([...selected, key])
                  : selected.filter(
                      (value) => value !== key && !dependenciesFor(value).includes(key),
                    ),
              )
            }
          />
          <span>
            <strong>{name}</strong>
            <br />
            <small className="crm-field-help">{description}</small>
          </span>
        </label>
      ))}
      <p className="crm-full">
        Required read permissions are selected automatically. Removing read access also removes its
        dependent permissions. Disabling login immediately blocks database access.
      </p>
    </FormDialog>
  );
}

function CredentialDialog({ agent, account, mode, onClose, onSaved }) {
  return (
    <FormDialog
      title={
        mode === 'create' ? `Create login for ${agent.name}` : `Reset password for ${agent.name}`
      }
      onClose={onClose}
      submitLabel={mode === 'create' ? 'Create login' : 'Reset password'}
      onSubmit={async (fields) => {
        if (fields.password !== fields.confirm) throw new Error('Passwords do not match.');
        const result = await accountService.credentials(mode, agent.id, fields.password);
        onSaved(
          result.warning ||
            (mode === 'create'
              ? 'Login created with profile-only access. You can now grant permissions.'
              : 'Password reset. Share the new password securely with the agent.'),
        );
      }}
    >
      <Field
        label="Login email"
        value={account?.email || agent.email}
        readOnly
        autoComplete="off"
      />
      <Field
        label="New password"
        name="password"
        type="password"
        required
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        required
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
      />
      <p className="crm-full">
        Use 12–128 characters. Share these credentials securely. No email is sent. Passwords are
        never shown again; agents can change theirs from My profile.
      </p>
      {mode === 'create' && (
        <p className="crm-full">
          The login uses this agent's directory email and the Agent role. New accounts can only view
          and edit their own profile until you grant additional access.
        </p>
      )}
    </FormDialog>
  );
}

export function Accounts() {
  const data = useSelector(selectWorkspace);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const toast = useToast();
  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setAccounts(await accountService.list());
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const saved = (message) => {
    toast(message);
    refresh();
  };
  return (
    <>
      <PageHeading
        title="Agent logins & access"
        subtitle="Create individual logins, reset passwords and control each agent's permissions."
      >
        <Button secondary disabled={loading} onClick={refresh}>
          Refresh accounts
        </Button>
        <Button to="/admin/agents">Manage agent profiles</Button>
      </PageHeading>
      {!isSupabase && (
        <Panel>
          <p className="crm-pad">
            Account creation and password management require the connected Supabase workspace. Demo
            accounts retain their predefined access.
          </p>
        </Panel>
      )}
      {error && (
        <p role="alert" className="crm-error">
          {error} Account controls are unavailable until the list is refreshed successfully.
        </p>
      )}
      {loading && <p role="status">Loading login accounts…</p>}
      <Panel title="Team login accounts">
        <div className="crm-pad">
          <Field
            label="Search login accounts"
            placeholder="Agent name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <DataTable
          rows={data.agents.filter((agent) =>
            `${agent.name} ${agent.email}`.toLowerCase().includes(query.toLowerCase().trim()),
          )}
          columns={[
            {
              title: 'Agent',
              render: (agent) => (
                <>
                  <strong>{agent.name}</strong>
                  <small>{agent.email}</small>
                </>
              ),
            },
            { title: 'Directory status', render: (agent) => <Badge value={agent.status} /> },
            {
              title: 'Login access',
              render: (agent) => {
                const account = accounts.find((a) => a.agent_id === agent.id);
                return account ? (
                  <>
                    {account.role === 'ADMIN'
                      ? 'Administrator-linked account'
                      : account.login_enabled
                        ? 'Enabled'
                        : 'Disabled'}
                    <small>{account.email}</small>
                    <small>{account.permissions?.length || 0} additional permissions</small>
                  </>
                ) : (
                  'No login created'
                );
              },
            },
            {
              title: 'Actions',
              render: (agent) => {
                const account = accounts.find((a) => a.agent_id === agent.id);
                const disabled = !isSupabase || loading || Boolean(error);
                return (
                  <div className="crm-actions">
                    {!account ? (
                      <Button
                        secondary
                        disabled={disabled || agent.status !== 'ACTIVE'}
                        onClick={() => setDialog({ mode: 'create', agent })}
                      >
                        Create login
                      </Button>
                    ) : (
                      account.role === 'AGENT' && (
                        <>
                          <Button
                            secondary
                            disabled={disabled}
                            onClick={() => setDialog({ mode: 'access', agent, account })}
                          >
                            Permissions
                          </Button>
                          <Button
                            secondary
                            disabled={disabled || agent.status !== 'ACTIVE'}
                            onClick={() => setDialog({ mode: 'resetPassword', agent, account })}
                          >
                            Reset password
                          </Button>
                        </>
                      )
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </Panel>
      {dialog &&
        (dialog.mode === 'access' ? (
          <AccessDialog {...dialog} onClose={() => setDialog(null)} onSaved={saved} />
        ) : (
          <CredentialDialog {...dialog} onClose={() => setDialog(null)} onSaved={saved} />
        ))}
    </>
  );
}
