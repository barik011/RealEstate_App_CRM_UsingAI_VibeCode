# Agent logins and individual permissions

## Administrator workflow

1. Open **Admin → Agents**, add the agent's name, email and contact profile, and keep their directory status Active.
2. Open **Admin → Logins & access** (`/admin/accounts`). Find the agent and choose **Create login**.
3. Enter and confirm a password of 12–128 characters. The agent signs in at `/agent/login` with the displayed login email and this password. Share it securely; the application sends no email and does not store a readable copy of the password.
4. Choose **Permissions** for that agent. New accounts start with **Profile only**. Select additional features and save.
5. Use **Reset password** when the agent needs a new password. Existing passwords cannot be viewed. Uncheck **Login enabled** in Permissions to immediately block their CRM data access, including existing sessions.

The account list displays the actual Auth login email separately from the directory email, which may differ for older imported accounts. Existing Auth accounts that are not linked to an agent cannot be claimed just by matching an email; a trusted account administrator must resolve those manually.

## Agent workflow

An enabled agent can always view/edit their own contact profile and use **My profile → Change password**. Password change asks for the current password, a new password and confirmation. Agents cannot edit their role, enable their own login, grant permissions, change directory status or edit another agent's profile.

Extra modules appear only when granted. Direct URLs and API requests are also checked. Lead data remains restricted to assigned leads, even when all agent permissions are enabled.

| Permission | Allows |
| --- | --- |
| Dashboard | Summaries of assigned leads |
| View assigned leads | Read assigned customers, notes and conversations |
| Update assigned leads | Update stages, priorities, notes, conversations and outcomes |
| View tasks / Manage tasks | Separate read and update access to assigned tasks/follow-ups |
| View viewings / Manage viewings | Separate read and update access to assigned viewings |
| Calendar | Calendar of permitted tasks and viewings |
| My reports | Reports and CSV exports for assigned leads |

Dependent read permissions are selected automatically. Removing read access removes dependent grants. Administrator functions such as creating/assigning leads, property management, team account management and company configuration remain administrator-only. Public property listings remain public.

Existing agent accounts retain their previous workspace access during migration, with the new assigned-lead reports permission included. Administrators can review or reduce each account's access using the new screen. New agent accounts receive no additional permissions.

## Security and deployment

- `202610190001_agent_access.sql` adds per-profile grants, login enablement, version-checked permission updates and audit entries. PostgreSQL RLS and the public command wrapper check permissions on every operation.
- `202610190002_profile_only_settings.sql` also hides company settings from profile-only agents.
- The `agent-accounts` Edge Function verifies the caller's JWT with Auth and checks the database ADMIN role before listing login accounts, creating credentials or resetting passwords. It never trusts user-editable metadata. The service credential stays in the Edge Function environment.
- An unsuccessful Auth/profile link rolls back the newly created Auth user when possible, and reports a cleanup error if operator intervention is needed. Passwords are not written to audit logs.
- Permission changes trigger profile refresh through Realtime, with existing periodic/focus refresh as a fallback. Database denial applies immediately even if a browser still has an older screen open.
- Login disablement denies CRM access; it does not delete the Auth account or historical records. Re-enabling restores only the explicitly saved grants.
- Account creation/reset is available in connected mode. Offline demo accounts remain predefined; the app does not pretend browser-local passwords provide real security.

Apply migrations with `npm run supabase:migrate`, deploy the function with `node scripts/supabase-deploy-accounts.mjs`, regenerate the fresh-install bootstrap with `npm run supabase:bootstrap`, and build the frontend with `npm run build`. The function uses its own JWT validation (`verify_jwt=false` at the gateway); anonymous or agent callers are rejected by the handler.

## Verification

`npm test` includes profile-only defaults, read/write separation, unknown permissions, assignment isolation, immediate revocation, stale permission edits and denial of direct calls to private workflow functions.

`node scripts/supabase-account-smoke.mjs http://localhost:5173` is an opt-in connected acceptance test. It creates temporary administrator/agent accounts, exercises account creation in the browser, individual permissions, password change/reset, disabled login and mobile layout, then removes its own accounts and CRM records. It sends no emails and does not change real team passwords.

Verified on 19 October 2026: 35 unit/database tests passed, translation and CSS checks passed, and the production build succeeded. The connected acceptance test passed against the deployed backend, including live grant/revocation updates without a browser reload. Temporary test records were removed. Desktop and mobile account screens and the permissions dialog were visually reviewed.

All 16 selected Chromium browser regressions passed, covering login, permission guards, CRM management, inquiry-to-sale workflows and responsive layouts.
