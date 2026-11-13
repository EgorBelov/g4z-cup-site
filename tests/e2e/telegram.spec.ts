import { expect, test, type BrowserContext } from "@playwright/test";
import { createSessionToken, SESSION_COOKIE } from "../../lib/auth/session";
import { fixtureSecret } from "../fixtures/environment";

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "Auth mutations only run against disposable local fixtures",
);

async function asAdmin(context: BrowserContext) {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: await createSessionToken(fixtureSecret),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("Telegram compatibility check is private and callback ignores external redirects", async ({
  page,
}) => {
  await page.goto("/admin/telegram");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/auth/callback?code=forged&next=https://example.com");
  await expect(page).toHaveURL(/\/login\?notice=expired/);
  expect(await page.context().cookies()).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: expect.stringMatching(/^sb-/) }),
    ]),
  );
});

test("Telegram PKCE callback preserves a private session, refreshes it and repeats the same Auth account", async ({
  page,
  context,
}, info) => {
  await asAdmin(context);
  await page.goto("/admin/telegram");
  await page.getByRole("button", { name: "Войти через Telegram" }).click();
  await expect(page).toHaveURL(/\/admin\/telegram\?result=success/);
  await expect(
    page.getByRole("heading", { name: "Сессия подтверждена" }),
  ).toBeVisible();
  await expect(page.getByText("@fixture_player", { exact: true })).toBeVisible();
  await expect(page.getByText("Не запрошен, вход без email")).toBeVisible();
  const id = "a1000000-0000-4000-8000-000000000001";
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  expect(await page.content()).not.toContain("editable_untrusted_name");
  expect(await page.content()).not.toContain("refresh_token");
  const authCookie = (await context.cookies()).find((cookie) =>
    /^sb-.*-auth-token$/.test(cookie.name),
  );
  expect(authCookie?.httpOnly).toBe(true);
  expect(authCookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("auth-token");

  // Force cookie expiry metadata to exercise the proxy/SDK refresh path.
  const session = JSON.parse(
    Buffer.from(authCookie!.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const oldRefresh = session.refresh_token;
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  await context.addCookies([
    {
      ...authCookie!,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
    },
  ]);
  const response = await page.reload();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  const refreshed = (await context.cookies()).find(
    (cookie) => cookie.name === authCookie!.name,
  )!;
  const freshSession = JSON.parse(
    Buffer.from(refreshed.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  expect(freshSession.refresh_token).not.toBe(oldRefresh);
  await page.screenshot({
    path: info.outputPath("telegram-check.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Выйти из Telegram-сессии" }).click();
  await expect(page.getByRole("heading", { name: "Готово к проверке" })).toBeVisible();
  expect(
    (await context.cookies()).some((cookie) => cookie.name === SESSION_COOKIE),
  ).toBe(true);
  await page.getByRole("button", { name: "Войти через Telegram" }).click();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Сессия подтверждена" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);

  await page.goto("/");
  const publicHtml = await page.content();
  expect(publicHtml).not.toContain(id);
  expect(publicHtml).not.toContain("fixture_player");
  // A real Auth session alone must never grant organiser access.
  await context.clearCookies({ name: SESSION_COOKIE });
  await page.goto("/admin/telegram");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("Telegram code requires the initiating browser and cannot be replayed", async ({
  page,
  context,
  browser,
}) => {
  await asAdmin(context);
  await page.goto("/admin/telegram?result=constructor");
  await expect(page.getByRole("heading", { name: "Готово к проверке" })).toBeVisible();
  const other = await browser.newContext();
  await asAdmin(other);
  const otherPage = await other.newPage();
  try {
    // Stop at the callback so its unconsumed code can be tested in another browser.
    let callback = "";
    await page.route("**/auth/v1/authorize?*", async (route) => {
      const upstream = await route.fetch({ maxRedirects: 0 });
      callback = upstream.headers().location ?? "";
      await route.fulfill({ status: 200, body: "Paused fixture callback" });
    });
    await page.goto("/admin/telegram");
    await page.getByRole("button", { name: "Войти через Telegram" }).click();
    await expect.poll(() => callback).not.toBe("");
    await otherPage.goto(`${callback}&next=https://example.com`);
    await expect(otherPage).toHaveURL(/\/login\?notice=expired/);
    await expect(
      otherPage.getByRole("heading", { name: "Снова на орбите." }),
    ).toBeVisible();
    await page.unroute("**/auth/v1/authorize?*");
    const response = await context.request.get(callback, { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response.headers().location).toContain("result=success");
    await page.goto(callback);
    await expect(page).toHaveURL(/\/admin\/telegram\?result=exchange/);
    // An invalid code cannot erase a previously valid session.
    await expect(
      page.getByRole("heading", { name: "Сессия подтверждена" }),
    ).toBeVisible();
    await page.goto("/auth/callback?code=first&code=second&next=https://example.com");
    await expect(page).toHaveURL(/result=missing-code/);
    await page.goto(
      "/auth/callback?error=access_denied&error_description=PRIVATE_SENTINEL",
    );
    await expect(page).toHaveURL(/result=provider/);
    expect(await page.content()).not.toContain("PRIVATE_SENTINEL");
  } finally {
    await other.close();
  }
});
