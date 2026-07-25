import { expect, test } from "@playwright/test";

/**
 * Smoke tests that pass with or without a populated database, so they can run
 * against a preview deployment or a local build in CI.
 */

const paths = ["/", "/archive"];

for (const path of paths) {
  test(`${path} responds and renders without client errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    expect(response?.status(), `${path} should not be a server error`).toBeLessThan(
      500,
    );
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    expect(errors, `console errors on ${path}`).toEqual([]);
  });
}

test("the archive page is reachable from the footer", async ({ page }) => {
  await page.goto("/archive");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Архив/);
});

test("unknown tournaments render the 404 page, not a crash", async ({ page }) => {
  const response = await page.goto("/t/definitely-not-a-tournament");

  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toContainText(/не найдена|не найден/i);
});

test("sitemap lists the archive", async ({ request }) => {
  const response = await request.get("/sitemap.xml");

  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("/archive");
});
