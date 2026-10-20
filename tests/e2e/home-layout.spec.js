import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
test('homepage rows and paired sections stay responsive with animated advantage cards', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/');
  await expect(page.locator('.highlight-card')).toHaveCount(8);
  for (const selector of ['.featured-section .property-card', '.home-layout .category-card']) {
    const tops = await page
      .locator(selector)
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  }
  for (const selector of ['.home-story-pair', '.home-investment-pair']) {
    const boxes = await page
      .locator(`${selector} > section`)
      .evaluateAll((items) =>
        items.map((item) => ({
          x: item.getBoundingClientRect().x,
          y: item.getBoundingClientRect().y,
        })),
      );
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
  }
  await page.screenshot({ path: 'artifacts/homepage-new-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const row = page.locator('.featured-section .single-row');
  expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.locator('.dubai-highlights').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/homepage-new-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'التبديل إلى العربية', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('short desktop sidebar and mobile navigation expose every admin menu through scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo Admin Login' }).click();
  const sidebar = page.locator('.crm-sidebar');
  await expect(sidebar).toBeVisible();
  expect(await sidebar.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await sidebar.getByRole('link', { name: 'Permissions', exact: true }).click();
  await expect(page).toHaveURL('/admin/permissions');
  expect(await sidebar.evaluate((el) => el.scrollTop > 0)).toBe(true);
  await page.screenshot({ path: 'artifacts/admin-sidebar-short.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 480 });
  await page.getByRole('button', { name: 'Open CRM navigation' }).click();
  const drawer = page.locator('.crm-drawer');
  expect(await drawer.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await drawer.getByRole('link', { name: 'Permissions', exact: true }).scrollIntoViewIfNeeded();
  expect(await drawer.evaluate((el) => el.scrollTop > 0)).toBe(true);
  await page.screenshot({ path: 'artifacts/admin-menu-short-mobile.png' });
  await drawer.getByRole('link', { name: 'Website content', exact: true }).click();
  await expect(page).toHaveURL('/admin/website');
});
