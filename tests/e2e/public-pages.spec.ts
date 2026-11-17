import { expect, test } from "@playwright/test";

/**
 * Smoke tests that pass with or without a populated database, so they can run
 * against a preview deployment or a local build in CI.
 */

const paths = ["/", "/archive", "/rules"];

test.beforeEach(async ({ page }) => {
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    // next start has no Vercel telemetry endpoints. Keep local smoke checks
    // isolated just like tournament.spec.ts; real previews still check them.
    await page.route("**/_vercel/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );
  }
});

for (const path of paths) {
  test(`${path} responds and renders without client errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push(`${message.text()} (${message.location().url})`);
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

test("home artwork keeps its full proportions on phones and monitors", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const image = page.locator(".orbit-home-image");
  await expect(image).toBeVisible();
  const sizes: [number, number][] = isMobile
    ? [
        [320, 740],
        [390, 844],
        [768, 1024],
      ]
    : [
        [1280, 720],
        [1440, 1000],
        [1920, 1080],
        [2560, 1440],
        [3440, 1440],
      ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    const layout = await image.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const copy = document.querySelector(".orbit-home-copy")!.getBoundingClientRect();
      return {
        ratio: rect.width / rect.height,
        imageHeight: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        copyTop: copy.top,
        copyBottom: copy.bottom,
        heroHeight: document.querySelector(".orbit-home-hero")!.getBoundingClientRect()
          .height,
        copyHeight: copy.height,
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(layout.ratio, `artwork proportions at ${width}px`).toBeCloseTo(
      1659 / 948,
      2,
    );
    expect(layout.left).toBeGreaterThanOrEqual(-1);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    if (width >= 1600) expect(layout.imageHeight).toBeLessThanOrEqual(721);
    if (isMobile) {
      expect(layout.top).toBeLessThan(layout.copyBottom);
      expect(layout.bottom).toBeGreaterThan(layout.copyTop);
      expect(layout.heroHeight).toBeLessThanOrEqual(layout.copyHeight + 1);
    }
  }
});

test("guest account redirects and sibling auth navigations preserve the return path", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login\?next=(?:%2F|\/)me$/);
  await page.getByRole("link", { name: "Создать аккаунт", exact: true }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Fme$/);
  await page.getByRole("link", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fme$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the regulations page is reachable from the footer", async ({ page }) => {
  await page.goto("/");
  // On mobile, horizontal overflow can enlarge innerWidth itself and distort
  // hit testing. Compare against the CSS viewport, not innerWidth.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    "the home page must fit the viewport before clicking footer links",
  ).toBeLessThanOrEqual(1);
  await page.getByRole("contentinfo").getByRole("link", { name: "Регламент" }).click();
  await expect(page).toHaveURL(/\/rules$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Регламент");
  await expect(page.getByRole("heading", { name: "Замены игроков" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Запрещённые оскорбления" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Присутствие в Discord" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Результаты" })).toBeVisible();
  // Discord rules are the eighth point, so the results stay ninth.
  await expect(page.locator(".orbit-doc-section")).toHaveCount(9);
  await expect(
    page
      .locator(".orbit-doc-section")
      .filter({ has: page.getByRole("heading", { name: "Результаты", exact: true }) })
      .locator(".orbit-doc-num"),
  ).toHaveText("09");
});

test("unknown tournaments render the 404 page, not a crash", async ({ page }) => {
  const response = await page.goto("/t/definitely-not-a-tournament");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Мимо орбиты." })).toBeVisible();
});

test("sitemap lists the archive and the regulations", async ({ request }) => {
  const response = await request.get("/sitemap.xml");

  expect(response.ok()).toBeTruthy();
  const sitemap = await response.text();
  expect(sitemap).toContain("/archive");
  expect(sitemap).toContain("/rules");
});

test("the liveness probe answers without touching the database", async ({
  request,
}) => {
  const response = await request.get("/api/ping");

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true });
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("public pages advertise a short edge cache", async ({ request }) => {
  const response = await request.get("/");

  expect(response.headers()["cdn-cache-control"]).toContain("s-maxage=30");
});
