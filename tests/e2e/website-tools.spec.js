import { test, expect } from '@playwright/test';
test('website drafts remain private until publish and admin controls visitor tools', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo Admin Login' }).click();
  await page.getByRole('link', { name: 'Website content', exact: true }).click();
  await page.getByLabel('Homepage headline', { exact: true }).fill('Find your next Dubai home');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByText('Draft saved. The public website is unchanged.', { exact: true }),
  ).toBeVisible();
  await page.goto('/');
  await expect(page.locator('h1')).not.toContainText('Find your next Dubai home');
  await page.goto('/admin/website');
  await expect(page.getByLabel('Homepage headline', { exact: true })).toHaveValue(
    'Find your next Dubai home',
  );
  await page.getByRole('button', { name: 'Publish website content' }).click();
  await expect(page.getByText('Website content published.', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Find your next Dubai home');
  await page.goto('/admin/website');
  await page.getByLabel('Content collection').selectOption('articles');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const dialog = page.getByRole('dialog');
  for (const [label, value] of [
    ['URL slug', 'new-community-guide'],
    ['Title', 'New community guide'],
    ['Category', 'Guides'],
    ['Publication date', '2026-10-19'],
    ['Image URL', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c'],
    ['Excerpt', 'A helpful local guide.'],
    ['Article paragraphs (one per line)', 'First paragraph.\nSecond paragraph.'],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByRole('button', { name: 'Apply to draft' }).click();
  await page.getByRole('button', { name: 'Publish website content' }).click();
  await expect(page.getByText('Website content published.', { exact: true })).toBeVisible();
  await page.goto('/blog/new-community-guide');
  await expect(page.locator('h1')).toContainText('New community guide');
  await expect(page.getByText('Second paragraph.', { exact: true })).toBeVisible();
  await page.goto('/admin/website');
  await page.getByLabel('Allow property comparison').uncheck();
  await page.getByRole('button', { name: 'Publish website content' }).click();
  await expect(page.getByText('Website content published.', { exact: true })).toBeVisible();
  await page.goto('/properties');
  await expect(page.getByRole('button', { name: 'Compare property', exact: true })).toHaveCount(0);
  await page.goto('/admin/website');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: 'artifacts/website-editor-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('visitors compare homes, restore saved filters and use detailed search', async ({ page }) => {
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Compare property', exact: true }).first().click();
  await page.getByRole('button', { name: 'Compare property', exact: true }).first().click();
  await page.getByRole('link', { name: 'Compare properties (2)', exact: true }).click();
  await expect(page.locator('.comparison-table thead th')).toHaveCount(3);
  await page.screenshot({ path: 'artifacts/property-comparison-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Remove', exact: true }).first().click();
  await expect(page.locator('.comparison-table thead th')).toHaveCount(2);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/properties');
  await page.getByLabel('Minimum area (sq ft)', { exact: true }).fill('2000');
  await page.getByLabel('Search name', { exact: true }).fill('Spacious homes');
  await page.getByRole('button', { name: 'Save this search', exact: true }).click();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.getByRole('button', { name: 'Spacious homes', exact: true }).click();
  await expect(page.getByLabel('Minimum area (sq ft)', { exact: true })).toHaveValue('2000');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Spacious homes', exact: true })).toBeVisible();
  await page.getByLabel('Amenity', { exact: true }).selectOption({ index: 1 });
  await expect(page).toHaveURL(/amenity=/);
  await page.screenshot({ path: 'artifacts/property-search-tools.png', fullPage: true });
});
