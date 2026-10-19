# Application review — 18 October 2026

> **19 October update:** Account administration is now implemented and deployed to the connected backend. Admins can create agent credentials, reset passwords, enable/disable login and grant permissions per agent. New accounts default to own-profile access. See [Agent accounts](AGENT_ACCOUNTS.md) for the current workflow and validation. The fixed-role findings below are historical. The connection incident was resolved as recorded at the end.

## Findings and delivered changes

The repository already included password login, administrator and agent workspaces, inquiry capture, assignment, tasks, viewings, deal outcomes, reports, bulk assignment, CSV exports, property management, English/Arabic public pages and Supabase authorization. The main login discoverability problem was that the public entry point existed only in the footer.

- Added a visible account control in the public header and an Agent login item in mobile navigation, with Arabic translations. Signed-in users can return directly to their workspace.
- Added `/agent/login` and `/admin/login`, retaining `/login`. The selected page does not grant a role; authenticated profiles determine access. Protected deep links preserve query parameters and anchors after login.
- Added administrator and agent permissions pages, plus a login setup link in agent management. These explain the existing fixed ADMIN/AGENT policy; they are not a custom-role editor.
- Centralized role validation. Unknown roles, missing account identities and agents without an agent ID are denied by ownership helpers, workspace selectors and mock commands. Previously, an unknown role with a matching agent ID could pass ownership helpers. This was a frontend/mock gap; existing Supabase RLS independently checked roles.
- Agent route guards now wait for account verification and show retry feedback if verification fails, rather than allowing access during loading/error states.
- Supabase profile loading rejects unsupported or incomplete roles. No database migration is needed for these frontend changes.

## Permission model

| Operation | Administrator | Active agent |
| --- | --- | --- |
| Create and assign leads | Yes | No |
| Read/process leads, notes, conversations and outcomes | All | Assigned only |
| Tasks, follow-ups, viewings | All | Assigned only |
| Agent directory and availability | Manage | Own contact profile only |
| Property catalog | Manage | Read |
| Team reports and company settings changes | Yes | No |
| Inspect permission summary | Team matrix | Own access |

Role assignment stays in trusted account administration. Inactive agents lose workspace access. Admins must transfer open work before deactivation. Browser controls are usability safeguards; shared-data authorization remains in database policies and command functions, consistent with [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Supabase RBAC guidance](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac).

## Account onboarding

Create an active directory entry, then provision/link its Supabase Auth account and AGENT profile using the existing trusted administration workflow in `SUPABASE_SETUP.md`. Directory creation alone does not provision credentials. The existing invitation script sends email when explicitly run. This review did not send invitations, modify live accounts, or publish the website.

## Next functional priorities

These are recommendations from the code review, not features claimed as delivered in this change:

1. **Account administration:** add a server-backed account screen showing invited/active/unlinked status, with audited invitation, recovery and role changes. Keep service credentials on a trusted server; enforce admin authorization and prevent removal of the last administrator. This closes the current directory-versus-login onboarding gap.
2. **Concurrent lead/profile edits:** extend the existing property version checks to leads, agent profiles and settings to avoid overwriting another user's edits.
3. **Scheduled reminders:** add a durable job queue, time-zone-aware delivery, opt-in preferences, provider configuration and delivery history. Current notifications are in-app and communications only log past conversations.
4. **Large CRM datasets:** replace full snapshot retrieval with server-filtered pagination and aggregate metrics. Preserve ownership rules and filtered export semantics.
5. **Inquiry operations:** add a duplicate-review queue and abuse protection at the public API boundary, preserving legitimate repeat property inquiries.
6. **Operational readiness:** test backup restoration, add error monitoring and deployment health checks, and verify Firefox/Safari alongside the existing Chromium suite.

## Validation scope

Results: 33 unit/database tests passed; all 16 selected browser scenarios passed across the initial run and targeted rerun. Three initial browser interruptions (stale Vite optimization cache, a development reload, and `ERR_NETWORK_CHANGED`) were rerun successfully after edits and build completed. The targeted rerun also repeated all three new login/permissions scenarios: 5/5 passed. Production build, CSS token checks and translation coverage passed. Desktop login, desktop role matrix and mobile permission screenshots were visually inspected and saved under `artifacts/`.

Unit/database tests exercise the workflow, unknown-role denial, missing ownership, cross-agent isolation, role escalation denial and inactive accounts. Browser regression tests cover password login, redirects, permissions, mobile entry points and existing CRM workflows. Translation coverage and the production build are also checked. Local SQL tests run the real migrations in PGlite; browser regression tests use isolated mock mode. These checks do not establish the state of the deployed site or hosted account provisioning.

The read-only `npm run supabase:status` check on 18 October failed with DNS `ENOTFOUND` for the configured Supabase hostname. Live account login and hosted database state could not be verified. Check that the configured project URL still identifies an available Supabase project and that DNS/network access is working before production acceptance. No remote records were changed.

### Connection incident resolved

Follow-up investigation identified the existing `realEstate-CRM` project as `INACTIVE` through the Supabase Management API. Resumed that project; it progressed through `COMING_UP` to `ACTIVE_HEALTHY`. The live property API returned 20 records, Auth administration responded successfully and REST returned HTTP 200. A fresh browser on `localhost:5173` loaded the homepage, property collection and connected agent login without JavaScript errors or failed Supabase requests. A separate WebSocket check confirmed a successful Realtime subscription. No application records were seeded, reset or edited. The status script now checks project state first and reports paused/restarting projects clearly.
