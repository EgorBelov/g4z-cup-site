import { test, expect } from '@playwright/test';

test('user can navigate through main tournament pages', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.locator('body')).toBeVisible();

  await page.goto('/schedule', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/schedule/);
  await expect(page.locator('body')).toContainText(/schedule|расписание|матч/i);

  await page.goto('/matches/1', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/matches\/1/);
  await expect(page.locator('body')).toBeVisible();

  await page.goto('/teams', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/teams/);
  await expect(page.locator('body')).toBeVisible();

  await page.goto('/teams/mid-destroyers', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/teams\/mid-destroyers/);
  await expect(page.locator('body')).toBeVisible();
});