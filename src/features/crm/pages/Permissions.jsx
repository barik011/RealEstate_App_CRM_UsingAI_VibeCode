import { useSelector } from 'react-redux';
import { selectUser } from '../store';
import { isAdmin } from '../constants';
import {
  PERMISSION_ROWS,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  permissionFor,
} from '../permissions';
import { PageHeading, Panel, Badge, Button } from '../components/UI';
import { isSupabase } from '../../../services/supabase/client';

export function Permissions() {
  const user = useSelector(selectUser);
  const admin = isAdmin(user);
  return (
    <>
      <PageHeading
        title={admin ? 'Roles & permissions' : 'My permissions'}
        subtitle="Access follows your authenticated account and lead assignments."
      />
      <Panel title="Your account">
        <div className="crm-pad">
          <p>
            {user.name} · {user.email}
          </p>
          <Badge value={user.role} />
          <p>
            {isSupabase
              ? 'Database policies enforce access to shared records.'
              : 'Demo permissions apply to this browser. Production access requires Supabase authentication and database policies.'}
          </p>
        </div>
      </Panel>
      <Panel title="Workspace access">
        <div className="crm-table-scroll">
          <table className="crm-table">
            <caption className="crm-pad">
              {admin ? 'Administrator and agent access' : 'Access for your account'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {admin ? (
                  <>
                    <th scope="col">Administrator</th>
                    <th scope="col">Agent</th>
                  </>
                ) : (
                  <th scope="col">Your access</th>
                )}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROWS.map(([name, resource]) => (
                <tr key={resource}>
                  <th scope="row">{name}</th>
                  {admin ? (
                    ['ADMIN', 'AGENT'].map((role) => (
                      <td key={role}>{PERMISSION_LABELS[ROLE_PERMISSIONS[role][resource]]}</td>
                    ))
                  ) : (
                    <td>{PERMISSION_LABELS[permissionFor(user, resource)]}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="crm-pad">
          <p>
            Only administrators can create or assign leads, manage agent availability, and add or
            remove properties. Agents can update their own contact profile and process assigned
            leads through tasks, viewings and deal outcomes.
          </p>
          <p>
            Inactive agents cannot use the workspace. Reassign their open work before deactivation.
            Role changes require trusted account administration.
          </p>
        </div>
      </Panel>
      {admin && (
        <Panel title="Agent login setup">
          <div className="crm-pad">
            <p>
              An agent directory entry does not create a login account. Create an active agent, then
              have your account administrator provision a Supabase Auth account linked to that agent
              ID with the AGENT role. The existing invitation script and setup guide describe this
              process.
            </p>
            <p>
              After setting their password, agents sign in at /agent/login. Password recovery is
              available from the login screen.
            </p>
            <Button to="/admin/agents">Manage agents</Button>
          </div>
        </Panel>
      )}
    </>
  );
}
