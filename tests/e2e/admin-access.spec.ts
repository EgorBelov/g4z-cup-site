import { expect, test } from "@playwright/test";

/**
 * The v1 site trusted a cookie whose value was the literal string
 * "authorized", so anyone could grant themselves admin access from devtools.
 * These tests lock the replacement down.
 */

const protectedPaths = [
  "/admin",
  "/admin/audit",
  "/admin/tournaments/new",
  "/admin/t/g4z-cup-10/matches",
  "/admin/t/g4z-cup-10/live",
];

for (const path of protectedPaths) {
  test(`${path} redirects anonymous visitors to the login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByLabel("Пароль")).toBeVisible();
  });
}

test("a forged session cookie does not grant access", async ({ page, context }) => {
  await page.goto("/admin/login");
  const { origin } = new URL(page.url());

  for (const value of ["authorized", "true", "1", "admin"]) {
    await context.clearCookies();
    await context.addCookies([{ name: "g4z_session", value, url: origin }]);

    await page.goto("/admin");
    await expect(page, `cookie value "${value}" must be rejected`).toHaveURL(
      /\/admin\/login/,
    );
  }
});

test("a truncated or re-signed token is rejected", async ({ page, context }) => {
  await page.goto("/admin/login");
  const { origin } = new URL(page.url());
  const payload = Buffer.from(
    JSON.stringify({ iat: 0, exp: 9_999_999_999, jti: "x" }),
  ).toString("base64url");

  await context.addCookies([
    { name: "g4z_session", value: `${payload}.not-a-real-signature`, url: origin },
  ]);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("wrong password is rejected with a visible error", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Пароль").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("status")).toBeVisible();
});

test("admin pages are excluded from robots.txt", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("Disallow: /admin");
});
