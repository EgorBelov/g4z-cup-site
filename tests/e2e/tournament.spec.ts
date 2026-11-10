import { expect, test } from "@playwright/test";
import { createSessionToken } from "../../lib/auth/session";
import { fixtureSecret } from "../fixtures/environment";

async function mockRealtime(
  page: import("@playwright/test").Page,
  onJoined?: (send: () => void) => void,
) {
  await page.route("**/_vercel/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (socket) => {
    socket.onMessage((message) => {
      // Realtime protocol v2 serializes messages as Phoenix arrays.
      const raw = JSON.parse(String(message));
      const packet = Array.isArray(raw)
        ? {
            join_ref: raw[0],
            ref: raw[1],
            topic: raw[2],
            event: raw[3],
            payload: raw[4],
          }
        : raw;
      const send = (event: string, payload: unknown) =>
        socket.send(
          JSON.stringify(
            Array.isArray(raw)
              ? [packet.join_ref, packet.ref, packet.topic, event, payload]
              : { topic: packet.topic, ref: packet.ref, event, payload },
          ),
        );
      const bindings = (packet.payload?.config?.postgres_changes ?? []).map(
        (filter: Record<string, string>, i: number) => ({ ...filter, id: i + 1 }),
      );
      if (["phx_join", "heartbeat", "phx_leave"].includes(packet.event))
        send("phx_reply", { status: "ok", response: { postgres_changes: bindings } });
      if (packet.event === "phx_join")
        onJoined?.(() =>
          send("postgres_changes", {
            ids: [1],
            data: {
              schema: "public",
              table: "matches",
              type: "UPDATE",
              columns: [],
              record: {},
              old_record: {},
              commit_timestamp: "2026-08-03T15:00:00Z",
            },
          }),
        );
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockRealtime(page);
});

async function fitsViewport(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
}

test("permanent community homepage includes current and other active tournaments", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("G4Z");
  await expect(
    page.getByRole("heading", { name: "G4Z CUP 11", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /осенний кубок/ })).toBeVisible();
  const primary = page.getByRole("link", { name: /К турнирам/ });
  expect(await primary.evaluate((el) => getComputedStyle(el).color)).not.toBe(
    await primary.evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  await fitsViewport(page);
});

test("motion can be stopped and persists after navigation", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  if (isMobile) await page.getByLabel("Меню", { exact: true }).click();
  const toggle = page
    .getByRole("button", { name: "Движение логотипа" })
    .filter({ visible: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  expect(
    await page
      .locator(".orbit-dot")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await page.goto("/archive", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
});

test("system reduced motion keeps the brand still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  expect(
    await page
      .locator(".orbit-dot")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("public pages and both bracket formats render populated data without overflow", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/archive",
    "/t/orbit-dota",
    "/t/orbit-dota/schedule",
    "/t/orbit-dota/groups",
    "/t/orbit-dota/teams",
    "/t/orbit-dota/teams/alpha",
    "/t/orbit-dota/matches/101",
    "/t/orbit-dota/bracket",
    "/t/orbit-cs/bracket",
    "/t/orbit-archive/results",
    "/t/orbit-empty",
  ]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await fitsViewport(page);
    if (route === "/t/orbit-dota/bracket") {
      await expect(
        page.getByRole("heading", { name: "Нижняя сетка", exact: true }),
      ).toBeVisible();
      if (info.project.name === "mobile") {
        const columns = page.locator(".md\\:w-72");
        const first = await columns.nth(0).boundingBox();
        const second = await columns.nth(1).boundingBox();
        expect(second!.y).toBeGreaterThan(first!.y + first!.height);
      }
    }
    if (
      ["/t/orbit-dota", "/t/orbit-dota/bracket", "/t/orbit-dota/matches/101"].includes(
        route,
      )
    )
      await page.screenshot({
        path: info.outputPath(`${route.replaceAll("/", "-")}.png`),
        fullPage: true,
        animations: "disabled",
      });
  }
  expect(errors).toEqual([]);
});

test("CS2 pages do not display Dota ratings or hero drafts", async ({ page }) => {
  await page.goto("/t/orbit-cs/teams/alpha", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).not.toContainText("MMR");
  await page.goto("/t/orbit-cs/matches/201", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toContainText("Карты матча");
  await expect(page.locator("main")).not.toContainText(
    /Radiant|Пики не внесены|Support/,
  );
});

test("mobile menu supports navigation and active tournament section", async ({
  page,
  isMobile,
}) => {
  await page.goto("/t/orbit-dota/schedule", { waitUntil: "domcontentloaded" });
  if (isMobile) await page.getByLabel("Меню", { exact: true }).click();
  const nav = page.getByRole("navigation", {
    name: isMobile ? "Мобильная навигация" : "Основная навигация",
  });
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Расписание");
  await nav.getByRole("link", { name: "Группы", exact: true }).click();
  await expect(page).toHaveURL(/\/groups$/);
  if (isMobile)
    expect(await page.locator("details.mobile-menu").getAttribute("open")).toBeNull();
});

test("organizer screens render against isolated fixtures", async ({
  page,
  context,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  await context.addCookies([
    {
      name: "g4z_session",
      value: await createSessionToken(fixtureSecret),
      url: baseURL!,
    },
  ]);
  for (const route of [
    "/admin",
    "/admin/tournaments/new",
    "/admin/t/orbit-dota",
    "/admin/t/orbit-dota/structure",
    "/admin/t/orbit-dota/teams",
    "/admin/t/orbit-dota/teams/10",
    "/admin/t/orbit-dota/matches",
    "/admin/t/orbit-dota/matches/101",
    "/admin/t/orbit-dota/live",
    "/admin/t/orbit-dota/results",
    "/admin/t/orbit-dota/history",
    "/admin/audit",
  ]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await fitsViewport(page);
    if (route.endsWith("/live")) {
      const button = page.getByRole("button", { name: /Выиграл карту/ }).first();
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(180);
      await page.screenshot({
        path: info.outputPath("live.png"),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  await page.goto("/admin/t/orbit-cs/matches/201", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Карты матча", { exact: true })).toBeVisible();
  await expect(page.getByText("Radiant", { exact: true })).toBeHidden();
});

test("tablet navigation fits without a horizontal page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/t/orbit-dota", { waitUntil: "domcontentloaded" });
  await fitsViewport(page);
});

test("keyboard users can skip navigation and close the mobile menu", async ({
  page,
  isMobile,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К содержимому" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  if (isMobile) {
    const menu = page.getByLabel("Меню", { exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("details.mobile-menu")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("details.mobile-menu")).not.toHaveAttribute("open");
    await expect(menu).toBeFocused();
  }
});

test("a saved map refreshes the score in a separate viewer session", async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "One isolated mutation exercises the shared live mechanism.",
  );
  const viewerContext = await browser.newContext();
  const viewer = await viewerContext.newPage();
  let publish: (() => void) | undefined;
  await mockRealtime(viewer, (send) => {
    publish = send;
  });
  await viewer.goto("/t/orbit-dota/matches/104", { waitUntil: "domcontentloaded" });
  await expect(viewer.getByLabel("Счёт 1:0", { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(publish)).toBe(true);
  await page.context().addCookies([
    {
      name: "g4z_session",
      value: await createSessionToken(fixtureSecret),
      url: baseURL!,
    },
  ]);
  await page.goto("/admin/t/orbit-dota/live", { waitUntil: "domcontentloaded" });
  const form = page
    .locator("form")
    .filter({ has: page.locator('input[name="match_id"][value="104"]') });
  await form.getByRole("button", { name: /БЕЗ СОКРАЩЕНИЙ.*Выиграл карту/ }).click();
  // The pending label changes immediately on click. Wait for the completed
  // action to remove the live card before publishing its database event.
  await expect(form).toHaveCount(0);
  const refreshed = viewer.waitForResponse(
    (response) =>
      response.url().includes("/t/orbit-dota/matches/104?") &&
      response.request().headers()["rsc"] === "1",
  );
  publish!();
  expect((await refreshed).ok()).toBeTruthy();
  await expect(viewer.getByLabel("Счёт 2:0", { exact: true })).toBeVisible();
  await viewerContext.close();
});

test("organizer lifecycle commands refresh the page and show validation errors", async ({
  page,
  context,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  await context.addCookies([
    {
      name: "g4z_session",
      value: await createSessionToken(fixtureSecret),
      url: baseURL!,
    },
  ]);
  const matchId = info.project.name === "mobile" ? 106 : 105;
  await page.goto(`/admin/t/orbit-dota/matches/${matchId}`);
  await page.getByRole("button", { name: "Начать матч", exact: true }).click();
  await expect(page.getByText("идёт сейчас", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(page.getByText("отменён", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Вернуть в расписание", exact: true }).click();
  await expect(page.getByText("по расписанию", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/admin/t/orbit-dota/matches/101");
  await page.getByRole("button", { name: "Вернуть в расписание", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Сначала удалите карты");
  await expect(page.getByText("идёт сейчас", { exact: true })).toBeVisible();
});
