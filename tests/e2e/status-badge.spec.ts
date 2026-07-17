import { test, expect } from '@playwright/test';

test.describe('Selftest Status Badge DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/__test/selftest');
  });

  test('renders loading state initially', async ({ page }) => {
    const loading = page.getByTestId('selftest-badge-loading');
    await expect(loading).toBeVisible({ timeout: 10000 });
  });

  test('loads and displays mode badges after fetch', async ({ page }) => {
    const badge = page.getByTestId('selftest-badge');
    await expect(badge).toBeVisible({ timeout: 15000 });

    const defaultBadge = page.getByTestId('badge-default');
    const teamworkBadge = page.getByTestId('badge-teamwork');
    const antigravityBadge = page.getByTestId('badge-antigravity');

    await expect(defaultBadge).toBeVisible();
    await expect(teamworkBadge).toBeVisible();
    await expect(antigravityBadge).toBeVisible();
  });

  test('antigravity mode shows "Coming Soon" in expanded details', async ({ page }) => {
    const trigger = page.getByTestId('selftest-badge-trigger');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click();

    const details = page.getByTestId('selftest-details');
    await expect(details).toBeVisible();

    const antigravityDetail = page.getByTestId('detail-antigravity');
    await expect(antigravityDetail).toBeVisible();

    const comingSoon = page.getByTestId('coming-soon-badge');
    await expect(comingSoon).toBeVisible();
    await expect(comingSoon).toHaveText('Coming Soon');
  });

  test('antigravity badge shows "Not Ready" not a broken/error state', async ({ page }) => {
    const antigravityBadge = page.getByTestId('badge-antigravity');
    await expect(antigravityBadge).toBeVisible({ timeout: 15000 });

    const badgeText = await antigravityBadge.textContent();
    expect(badgeText).toContain('Antigravity');

    const hasErrorIndicator = await antigravityBadge.locator('text=✗').count();
    const hasRefreshIndicator = await antigravityBadge.locator('text=🔄').count();
    expect(hasRefreshIndicator + hasErrorIndicator).toBe(1);
  });

  test('toggle expand/collapse works correctly', async ({ page }) => {
    const trigger = page.getByTestId('selftest-badge-trigger');
    await expect(trigger).toBeVisible({ timeout: 15000 });

    await trigger.click();
    const details = page.getByTestId('selftest-details');
    await expect(details).toBeVisible();

    await trigger.click();
    await expect(details).not.toBeVisible();
  });
});
