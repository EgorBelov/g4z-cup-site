import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', titlePart: 'G4Z' },
  { path: '/schedule', titlePart: 'G4Z' },
  { path: '/groups', titlePart: 'G4Z' },
  { path: '/playoff', titlePart: 'G4Z' },
  { path: '/teams', titlePart: 'G4Z' },
  { path: '/matches/1', titlePart: 'G4Z' },
  { path: '/matches/2', titlePart: 'G4Z' },
  { path: '/matches/4', titlePart: 'G4Z' },
  { path: '/teams/mid-destroyers', titlePart: 'G4Z' },
];

for (const pageConfig of pages) {
  test(`page ${pageConfig.path} opens successfully`, async ({ page }) => {
    const response = await page.goto(pageConfig.path, {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(new RegExp(pageConfig.titlePart, 'i'));
    await expect(page.locator('body')).toBeVisible();
  });
}