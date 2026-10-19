// Connected CMS acceptance: temporary administrator; all content writes roll back.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { admin, sql } from './supabase-admin.mjs';
const email = `website-test-${randomUUID()}@example.invalid`;
const password = `${randomUUID()}Aa1!`;
let userId, browser;
try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  const inserted = await admin
    .from('profiles')
    .insert({ id: userId, name: 'Website Test Admin', role: 'ADMIN' });
  if (inserted.error) throw inserted.error;
  const check = await sql(`begin;
 select set_config('request.jwt.claim.sub','${userId}',true);
 set local role authenticated;
 do $$declare current_record jsonb; published jsonb; result jsonb; begin
   current_record:=public.website_content('site');
   select data into published from public.public_content where kind='site';
   result:=public.website_content('site','draft',jsonb_set(published,'{heroTitle}','"Private validation headline"'),(current_record->>'version')::bigint);
   if (select data->>'heroTitle' from public.public_content where kind='site')='Private validation headline' then raise exception 'Draft leaked'; end if;
   perform public.website_content('site','publish',published,(result->>'version')::bigint);
 end $$;
 rollback;
 select true as passed;`);
  assert.ok(check.some((v) => v.passed));
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: process.argv[2] || 'http://localhost:5173' });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
  await page.getByRole('link', { name: 'Website content', exact: true }).click();
  await expect(page.getByLabel('Website brand')).not.toHaveValue('', { timeout: 30000 });
  await page.screenshot({ path: 'artifacts/website-editor-connected.png', fullPage: true });
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Compare property', exact: true }).first().click();
  await page.getByRole('link', { name: 'Compare properties (1)', exact: true }).click();
  await expect(page.locator('.comparison-table')).toBeVisible();
  console.log(
    'PASS: connected CMS authorization/read, private draft and publication transaction, public property comparison. Content writes rolled back.',
  );
} finally {
  await browser?.close();
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
  console.log('Temporary website-test administrator removed.');
}
