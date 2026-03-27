import { test, expect } from '@playwright/test';

test('team details page renders team content', async ({ page }) => {
  await page.goto('/teams/mid-destroyers', { waitUntil: 'networkidle' });

  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).toContainText(/mid destroyers/i);
});