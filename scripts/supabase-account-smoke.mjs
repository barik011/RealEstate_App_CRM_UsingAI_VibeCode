// Connected acceptance test: temporary accounts only, no invitation emails.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, expect as baseExpect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { admin, url } from './supabase-admin.mjs';

const baseURL = process.argv[2] || 'http://localhost:5173';
const expect = baseExpect.configure({ timeout: 30000 });
const run = randomUUID();
const password = `${randomUUID()}Aa1!`;
const changedPassword = `${randomUUID()}Bb2!`;
const resetPassword = `${randomUUID()}Cc3!`;
const agentIds = [0, 1].map((i) => `ACCESS-${run}-${i}`);
const emails = [0, 1].map((i) => `access-${run}-${i}@example.invalid`);
const userIds = [];
const leadIds = [];
const problems = [];
let browser;
const checked = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const client = () =>
  createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const login = async (page, email, pass) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};
try {
  const adminEmail = `access-admin-${run}@example.invalid`;
  const { user: owner } = checked(
    await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true }),
  );
  userIds.push(owner.id);
  checked(
    await admin.from('profiles').insert({ id: owner.id, name: 'Access Test Admin', role: 'ADMIN' }),
  );
  for (const [i, id] of agentIds.entries())
    checked(
      await admin
        .from('agents')
        .insert({
          id,
          name: `Access Test Agent ${i + 1}`,
          email: emails[i],
          phone: '+971500000000',
          specialization: 'Access verification',
          languages: ['English'],
          locations: ['Dubai'],
          status: 'ACTIVE',
        }),
    );
  const ownerClient = client();
  checked(await ownerClient.auth.signInWithPassword({ email: adminEmail, password }));
  for (const [i, agentId] of agentIds.entries()) {
    const lead = checked(
      await ownerClient.rpc('crm_command', {
        command: 'createLead',
        payload: {
          name: `Access test ${run} ${i}`,
          email: `lead-${run}-${i}@example.invalid`,
          phone: '+971500000000',
          country: 'UAE',
        },
      }),
    );
    leadIds.push(lead.id);
    checked(
      await ownerClient.rpc('crm_command', {
        command: 'assign',
        payload: { id: lead.id, agentId },
      }),
    );
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => problems.push(e.message));
  await login(page, adminEmail, password);
  await expect(page).toHaveURL('/admin/dashboard');
  await page.getByRole('link', { name: 'Logins & access', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agent logins & access' })).toBeVisible();
  await page.getByLabel('Search login accounts').fill('Access Test Agent');
  for (let i = 0; i < 2; i++) {
    const row = page.getByRole('row').filter({ hasText: `Access Test Agent ${i + 1}` });
    await expect(row.getByRole('button', { name: 'Create login', exact: true })).toBeEnabled();
    await row.getByRole('button', { name: 'Create login', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('New password', { exact: true }).fill(password);
    await dialog.getByLabel('Confirm password', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Create login', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('0 additional permissions');
    const profile = checked(
      await admin.from('profiles').select('id,permissions').eq('agent_id', agentIds[i]).single(),
    );
    userIds.push(profile.id);
    assert.deepEqual(profile.permissions, []);
  }
  await page.screenshot({ path: 'artifacts/agent-accounts-desktop.png', fullPage: true });
  const row = page.getByRole('row').filter({ hasText: 'Access Test Agent 1' });
  const agentContext = await browser.newContext({ baseURL });
  const agentPage = await agentContext.newPage();
  agentPage.setDefaultTimeout(30000);
  agentPage.on('pageerror', (e) => problems.push(e.message));
  await login(agentPage, emails[0], password);
  await expect(agentPage).toHaveURL('/agent/profile');
  await expect(agentPage.getByRole('heading', { name: 'My profile' })).toBeVisible();
  await expect(
    agentPage
      .getByRole('navigation', { name: 'CRM navigation' })
      .getByRole('link', { name: 'My Leads', exact: true }),
  ).toHaveCount(0);
  await agentPage.screenshot({ path: 'artifacts/agent-profile-only.png', fullPage: true });
  const agentClient = client();
  checked(await agentClient.auth.signInWithPassword({ email: emails[0], password }));
  assert.equal(checked(await agentClient.from('leads').select('id')).length, 0);
  const anonymous = await fetch(`${url}/functions/v1/agent-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });
  assert.equal(anonymous.status, 401);
  const forbidden = await agentClient.functions.invoke('agent-accounts', {
    body: { action: 'list' },
  });
  assert.equal(forbidden.error?.context?.status, 403);
  await row.getByRole('button', { name: 'Permissions', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /^View assigned leads/ })
    .check();
  await page.screenshot({ path: 'artifacts/agent-permission-controls.png', fullPage: true });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save permissions', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    agentPage
      .getByRole('navigation', { name: 'CRM navigation' })
      .getByRole('link', { name: 'My Leads', exact: true }),
  ).toBeVisible();
  await agentPage.goto('/agent/leads');
  await expect(agentPage.getByRole('heading', { name: 'My leads', exact: true })).toBeVisible();
  const visible = checked(await agentClient.from('leads').select('id'));
  assert.deepEqual(
    visible.map((r) => r.id),
    [leadIds[0]],
  );
  assert.ok(
    (
      await agentClient.rpc('crm_command', {
        command: 'note',
        payload: { id: leadIds[0], content: 'Denied read-only edit' },
      })
    ).error,
  );
  await agentPage.goto(`/agent/leads/${leadIds[0]}`);
  await expect(agentPage.getByRole('button', { name: 'Add note', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Permissions', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /^Update assigned leads/ })
    .check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save permissions', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await agentPage.reload();
  await expect(
    agentPage.getByRole('button', { name: 'Add note', exact: true }).first(),
  ).toBeVisible();
  checked(
    await agentClient.rpc('crm_command', {
      command: 'note',
      payload: { id: leadIds[0], content: 'Allowed explicit permission' },
    }),
  );
  assert.ok(
    (
      await agentClient.rpc('crm_command', {
        command: 'note',
        payload: { id: leadIds[1], content: 'Denied cross-agent edit' },
      })
    ).error,
  );
  const otherClient = client();
  checked(await otherClient.auth.signInWithPassword({ email: emails[1], password }));
  assert.equal(checked(await otherClient.from('leads').select('id')).length, 0);
  await agentPage.goto('/agent/profile');
  await agentPage.getByRole('button', { name: 'Change password', exact: true }).click();
  let dialog = agentPage.getByRole('dialog');
  await dialog.getByLabel('Current password').fill(password);
  await dialog.getByLabel('New password', { exact: true }).fill(changedPassword);
  await dialog.getByLabel('Confirm password', { exact: true }).fill(changedPassword);
  await dialog.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  checked(await client().auth.signInWithPassword({ email: emails[0], password: changedPassword }));
  assert.ok((await client().auth.signInWithPassword({ email: emails[0], password })).error);
  await row.getByRole('button', { name: 'Reset password', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('New password', { exact: true }).fill(resetPassword);
  await dialog.getByLabel('Confirm password', { exact: true }).fill(resetPassword);
  await dialog.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  checked(await client().auth.signInWithPassword({ email: emails[0], password: resetPassword }));
  await row.getByRole('button', { name: 'Permissions', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: 'Login enabled', exact: true })
    .uncheck();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save permissions', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  assert.equal(checked(await agentClient.from('leads').select('id')).length, 0);
  assert.ok(
    (
      await agentClient.rpc('crm_command', {
        command: 'note',
        payload: { id: leadIds[0], content: 'Denied disabled account' },
      })
    ).error,
  );
  await expect(agentPage).toHaveURL('/login');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/agent-accounts-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(problems, []);
  console.log(
    'PASS: admin creates two logins; profile-only defaults; per-agent read/write permissions; cross-agent and anonymous denial; own password change; admin reset; login revocation; responsive account screen.',
  );
} finally {
  await browser?.close();
  // Discover any account created before an assertion failed; never touch other IDs.
  const linked = checked(await admin.from('profiles').select('id').in('agent_id', agentIds));
  for (const row of linked) if (!userIds.includes(row.id)) userIds.push(row.id);
  if (leadIds.length) {
    for (const table of ['notifications', 'lead_notes', 'lead_activities', 'tasks', 'viewings'])
      checked(await admin.from(table).delete().in('lead_id', leadIds));
    checked(await admin.from('leads').delete().in('id', leadIds));
  }
  checked(await admin.from('agent_events').delete().in('agent_id', agentIds));
  for (const id of userIds) checked(await admin.auth.admin.deleteUser(id));
  checked(await admin.from('agents').delete().in('id', agentIds));
  console.log('Temporary account-test records removed.');
}
