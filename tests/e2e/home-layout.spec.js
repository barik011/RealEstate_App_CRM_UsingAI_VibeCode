import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
test('homepage full-width sections and story image controls stay responsive', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await expect(page.locator('.highlight-card')).toHaveCount(8);
  for (const selector of ['.featured-section .property-card', '.home-layout .category-card']) {
    const tops = await page
      .locator(selector)
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  }
  const sections = page.locator(
    '.home-layout > .story-showcase, .home-layout > .locations-panel, .home-layout > .investment-showcase, .home-layout > .testimonials-showcase',
  );
  const boxes = await sections.evaluateAll((items) =>
    items.map((item) => {
      const r = item.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, bottom: r.bottom };
    }),
  );
  expect(boxes).toHaveLength(4);
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].bottom);
    expect(boxes[i].width).toBeCloseTo(boxes[0].width, 0);
  }
  const storyButtons = page.locator('.story-points button');
  const images = new Set();
  for (let i = 0; i < 3; i++) {
    await storyButtons.nth(i).click();
    await expect(storyButtons.nth(i)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.story-caption span')).toHaveText(`0${i + 1} / 03`);
    images.add(await page.locator('.story-frame img').getAttribute('src'));
  }
  expect(images.size).toBe(3);
  const quote = page.locator('.testimonial-card blockquote');
  const firstQuote = await quote.textContent();
  await page.getByRole('button', { name: 'Next testimonial' }).click();
  await expect(quote).not.toHaveText(firstQuote);
  await page.getByRole('button', { name: 'Previous testimonial' }).click();
  await expect(quote).toHaveText(firstQuote);
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
