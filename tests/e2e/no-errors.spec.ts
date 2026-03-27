import { test, expect } from '@playwright/test';

test('home page has no page errors and no failed document request', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  expect(pageErrors).toEqual([]);

  // Иногда у внешних шрифтов/метрик бывают несущественные ошибки.
  // Если будут ложные срабатывания, можно отфильтровать домены.
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});