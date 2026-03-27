import { test, expect } from '@playwright/test';

test('header navigation works', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const body = page.locator('body');

  // Подстрой названия под свои реальные пункты меню
  const scheduleLink = page.getByRole('link', { name: /schedule|расписание/i }).first();
  await expect(scheduleLink).toBeVisible();
  await scheduleLink.click();
  await expect(page).toHaveURL(/\/schedule/);
  await expect(body).toBeVisible();

  await page.goto('/', { waitUntil: 'networkidle' });

  const groupsLink = page.getByRole('link', { name: /groups|группы/i }).first();
  await expect(groupsLink).toBeVisible();
  await groupsLink.click();
  await expect(page).toHaveURL(/\/groups/);

  await page.goto('/', { waitUntil: 'networkidle' });

  const playoffLink = page.getByRole('link', { name: /playoff|плей-офф/i }).first();
  await expect(playoffLink).toBeVisible();
  await playoffLink.click();
  await expect(page).toHaveURL(/\/playoff/);

  await page.goto('/', { waitUntil: 'networkidle' });

  const teamsLink = page.getByRole('link', { name: /teams|команды/i }).first();
  await expect(teamsLink).toBeVisible();
  await teamsLink.click();
  await expect(page).toHaveURL(/\/teams/);
});