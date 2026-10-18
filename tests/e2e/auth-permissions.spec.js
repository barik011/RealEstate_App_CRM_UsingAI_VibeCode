import { test, expect } from '@playwright/test';

test('visible agent entry, password login, scoped permissions and denied administrator access', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('header').getByRole('link', { name: 'Agent login', exact: true }).click();
  await expect(page).toHaveURL('/agent/login');
  await expect(page.getByRole('heading', { name: 'Agent login', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/agent-login-desktop.png', fullPage: true });
  await page.getByLabel('Email', { exact: true }).fill('agent@dubaihouse.demo');
  await page.getByLabel('Password', { exact: true }).fill('Demo123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/agent/dashboard');
  await page.getByRole('link', { name: 'My permissions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My permissions' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Change company settings No access' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My permissions' })).toBeVisible();
  await page.goto('/admin/permissions');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('header').getByRole('link', { name: 'My workspace' })).toHaveAttribute(
    'href',
    '/agent/dashboard',
  );
});

test('deep link keeps filters and administrator login shows the permission matrix', async ({
  page,
}) => {
  await page.goto('/agent/leads?status=FOLLOW_UP');
  await expect(page).toHaveURL('/login');
  await page.getByRole('button', { name: 'Demo Agent Login' }).click();
  await expect(page).toHaveURL('/agent/leads?status=FOLLOW_UP');
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Administrator login' })).toBeVisible();
  await page.getByRole('button', { name: 'Demo Admin Login' }).click();
  await expect(page).toHaveURL('/admin/dashboard');
  await page.getByRole('link', { name: 'Permissions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Roles & permissions' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/role-permissions-desktop.png', fullPage: true });
  await expect(
    page.getByRole('row', { name: 'Agent profiles All records Own profile only' }),
  ).toBeVisible();
});

test('mobile navigation exposes agent login without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Agent login' })
    .click();
  await expect(page).toHaveURL('/agent/login');
  await page.getByRole('button', { name: 'Demo Agent Login' }).click();
  await page.goto('/agent/permissions');
  await expect(page.getByRole('heading', { name: 'My permissions' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/agent-permissions-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
