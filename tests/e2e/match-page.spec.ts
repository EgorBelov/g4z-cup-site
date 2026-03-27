import { test, expect } from '@playwright/test';

test('match details page renders core content', async ({ page }) => {
  await page.goto('/matches/1', { waitUntil: 'networkidle' });

  await expect(page.locator('body')).toBeVisible();

  // Подстрой под реальные тексты страницы
  await expect(page.locator('body')).toContainText(/bo[1-5]|матч|game|игра/i);

  // Если есть команды, можно проверять наличие каких-то блоков
  // Например карточек, счёта, списка игр и т.д.
});