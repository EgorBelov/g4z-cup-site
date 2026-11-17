import { expect, test, type Page } from "@playwright/test";

const reveals =
  ".orbit-reveal, .orbit-reveal-card, .orbit-reveal-left, .orbit-reveal-right";

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "Motion regression uses isolated tournament fixtures",
);

async function openHome(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#tournaments .orbit-reveal-card").first()).toHaveAttribute(
    "data-reveal-state",
    /pending|entering|visible/,
  );
}

async function scrollTo(page: Page, top: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
}

async function visibleRevealsAreFinished(page: Page) {
  await expect
    .poll(() =>
      page.locator(reveals).evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return (
              element.checkVisibility() &&
              rect.height > 0 &&
              rect.bottom > 0 &&
              rect.top < innerHeight - 81
            );
          })
          .every((element) => {
            const style = getComputedStyle(element);
            return (
              style.opacity === "1" &&
              ["none", "0px", "0px 0px"].includes(style.translate) &&
              style.animationName === "none"
            );
          }),
      ),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  if (!process.env.PLAYWRIGHT_BASE_URL)
    await page.route("**/_vercel/**", (route) =>
      route.fulfill({ status: 200, body: "" }),
    );
});

test("home reveals finish while scrolling is stopped on phones and monitors", async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const sizes: [number, number][] = isMobile
    ? [
        [320, 740],
        [390, 667],
        [390, 844],
        [844, 390],
        [768, 1024],
      ]
    : [
        [1366, 768],
        [1440, 900],
        [1920, 600],
        [1920, 900],
        [1920, 1080],
        [2560, 1440],
        [3440, 1440],
        [3440, 800],
        [1920, 2160],
        [3840, 2160],
      ];

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await openHome(page);
    const distance = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    for (let top = 0; top < distance + height; top += height * 0.65) {
      await scrollTo(page, Math.min(top, distance));
      await visibleRevealsAreFinished(page);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        `${width}×${height} at ${top}px`,
      ).toBeLessThanOrEqual(1);
    }
    await expect(page.locator("#community")).toHaveCSS("opacity", "1");
    // Returning to a section must not hide its content or replay its entrance.
    await scrollTo(page, 0);
    await visibleRevealsAreFinished(page);
    expect(await page.locator('[data-reveal-state="entering"]').count()).toBe(0);
    if (width === 2560 || width === 390) {
      await scrollTo(page, distance);
      await page.screenshot({ path: info.outputPath(`home-motion-${width}.png`) });
    }
  }
  expect(errors).toEqual([]);
});

test("anchors, keyboard focus, archive and filters keep content visible", async ({
  page,
}) => {
  await openHome(page);
  await page.getByRole("link", { name: "К турнирам", exact: false }).click();
  await visibleRevealsAreFinished(page);
  const filters = page.getByRole("group", { name: "Дисциплина турниров" });
  if (await filters.count()) {
    await filters.getByRole("button", { name: /CS2/ }).click();
    await expect(page.locator("#tournaments .orbit-reveal-card")).toHaveCount(1);
    await visibleRevealsAreFinished(page);
    await filters.getByRole("button", { name: /Все игры/ }).click();
    await visibleRevealsAreFinished(page);
  }
  await page.locator("#community a").first().focus();
  await expect(page.locator("#community")).toHaveCSS("opacity", "1");
  await expect(page.locator("#community")).toHaveAttribute(
    "data-reveal-state",
    "visible",
  );
  await page.locator(".orbit-home-archive summary").click();
  await expect(page.locator(".orbit-home-archive")).toHaveAttribute("open", "");
  const archiveCard = page.locator(".orbit-home-archive li").last();
  await archiveCard.scrollIntoViewIfNeeded();
  await expect(archiveCard).toHaveCSS("opacity", "1");
  await visibleRevealsAreFinished(page);
});

test("a card animates on entry and finishes without another scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openHome(page);
  const card = page.locator(".orbit-editorial-slot").first();
  await expect(card).toHaveAttribute("data-reveal-state", "pending");
  const position = await card.evaluate(
    (element) => element.getBoundingClientRect().top + scrollY - innerHeight * 0.6,
  );
  await scrollTo(page, position);
  await expect(card).toHaveCSS("animation-name", "orbit-reveal-in");
  await expect(card).toHaveAttribute("data-reveal-state", "visible");
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toHaveCSS("translate", "none");
});

test("resizing and changing motion preferences never leave hidden content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scrollTo(page, 100_000);
  await visibleRevealsAreFinished(page);
  await expect(page.locator(".orbit-scroll-progress")).toHaveCSS("display", "none");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  const card = page.locator(".orbit-editorial-card").first();
  await card.hover();
  await expect(card).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 2560, height: 2160 });
  await scrollTo(page, 100_000);
  await visibleRevealsAreFinished(page);
  await expect(page.locator("#community")).toHaveCSS("opacity", "1");
});

test("home content stays visible without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await scrollTo(page, 100_000);
    await visibleRevealsAreFinished(page);
    await expect(page.locator("#community")).toHaveCSS("opacity", "1");
  } finally {
    await context.close();
  }
});

test("scroll progress follows the document and card hover stays independent of reveals", async ({
  page,
  isMobile,
}) => {
  await openHome(page);
  const supported = await page.evaluate(() =>
    CSS.supports("animation-timeline", "scroll()"),
  );
  if (supported) {
    for (const fraction of [0, 0.5, 1]) {
      await page.evaluate(
        (fraction) =>
          window.scrollTo({
            top: (document.documentElement.scrollHeight - innerHeight) * fraction,
            behavior: "instant",
          }),
        fraction,
      );
      await expect
        .poll(() =>
          page
            .locator(".orbit-scroll-progress")
            .evaluate(
              (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
            ),
        )
        .toBeCloseTo(fraction, 2);
    }
  }
  const card = page.locator(".orbit-editorial-card").first();
  await card.scrollIntoViewIfNeeded();
  await visibleRevealsAreFinished(page);
  await card.hover();
  await expect(card).toHaveCSS(
    "transform",
    isMobile ? "none" : "matrix(1, 0, 0, 1, 0, -4)",
  );
  await page.mouse.move(0, 0);
  await expect(card).toHaveCSS("transform", "none");
});
