import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { createSessionToken, SESSION_COOKIE } from "../../lib/auth/session";
import { fixtureSecret } from "../fixtures/environment";

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "Writes run only against disposable PostgreSQL fixtures",
);
test.use({ actionTimeout: 15000, trace: "retain-on-failure" });

async function asTelegram(page: Page, number: number) {
  // Independent fixture players must not consume one shared localhost IP quota.
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8::${number.toString(16)}`,
  });
  await page.route("**/auth/v1/authorize?*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("fixture_user", String(number));
    return route.continue({ url: url.toString() });
  });
  await page.route("**/_vercel/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
}
async function fillProfile(page: Page, name: string, number: number) {
  await page.getByLabel("Публичный ник", { exact: true }).fill(name);
  await page
    .getByLabel("Telegram для связи", { exact: true })
    .fill(`@private_contact_${number}`);
  await page
    .getByLabel("Ссылка на Steam", { exact: true })
    .fill(`https://steamcommunity.com/id/private-player-${number}`);
}
async function signup(page: Page, name: string, number: number, next = "/me") {
  await asTelegram(page, number);
  await page.goto(`/register?next=${encodeURIComponent(next)}`);
  await fillProfile(page, name, number);
  await page.getByRole("button", { name: "Создать аккаунт через Telegram" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
}
async function admin(context: BrowserContext) {
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

test("registration preserves form on OAuth cancellation and returns to the original invite or tournament", async ({
  page,
  isMobile,
}) => {
  const number = isMobile ? 501 : 401;
  await asTelegram(page, number);
  await page.route("**/auth/callback?code=*", (route) =>
    route.fulfill({ status: 200, body: "Paused callback" }),
  );
  // Intercept the initial authorize request, because redirects are not routed twice.
  await page.unroute("**/auth/v1/authorize?*");
  await page.route("**/auth/v1/authorize?*", async (route) => {
    await route.fulfill({
      status: 302,
      headers: { Location: "http://127.0.0.1:3000/auth/callback?error=access_denied" },
      body: "",
    });
  });
  await page.goto("/register?next=/t/g4z-cup-13/register");
  await fillProfile(page, `Draft ${number}`, number);
  await page.getByRole("button", { name: "Создать аккаунт через Telegram" }).click();
  await expect(page).toHaveURL(/\/register\?notice=provider/);
  await expect(page.getByLabel("Публичный ник", { exact: true })).toHaveValue(
    `Draft ${number}`,
  );
  expect(page.url()).not.toContain("private_contact");
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "g4z_auth_flow",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.value).not.toContain("private_contact");
  await page.unroute("**/auth/v1/authorize?*");
  await page.unroute("**/auth/callback?code=*");
  await asTelegram(page, number);
  await page.getByRole("button", { name: "Создать аккаунт через Telegram" }).click();
  await expect(page).toHaveURL(/\/t\/g4z-cup-13\/register$/);
  await expect(
    page.getByRole("button", { name: "Ищу команду", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("captains invite persistent members without granting team management", async ({
  page,
  browser,
  isMobile,
}) => {
  test.setTimeout(120_000);
  const number = isMobile ? 800 : 700;
  const suffix = isMobile ? "mobile" : "desktop";
  const crewContext = await browser.newContext();
  try {
    await signup(page, `Persistent captain ${suffix}`, number);
    await page.goto("/me/teams/new");
    await page
      .getByLabel("Название команды", { exact: true })
      .fill(`Persistent ${suffix}`);
    await page.getByRole("button", { name: "Создать команду", exact: true }).click();
    await expect(page).toHaveURL(/\/me\/teams\/\d+$/);
    const managementPath = new URL(page.url()).pathname;
    const publicPath = await page
      .getByRole("link", { name: "Публичная страница ↗" })
      .getAttribute("href");
    const crew = await crewContext.newPage();
    await signup(crew, `Persistent crew ${suffix}`, number + 1);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Участники команды", exact: true }),
    });
    await section
      .getByLabel("Ник игрока", { exact: true })
      .fill(`Persistent crew ${suffix}`);
    await section.getByRole("button", { name: "Найти игрока", exact: true }).click();
    await section.getByRole("button", { name: "Пригласить", exact: true }).click();
    await expect(
      section.getByText(`Persistent crew ${suffix} · ожидает подтверждения`),
    ).toBeVisible();
    expect(await page.content()).not.toContain(`private_contact_${number + 1}`);
    await crew.reload();
    await crew
      .getByRole("button", { name: "Принять приглашение в команду", exact: true })
      .click();
    await expect(crew.getByText("участник", { exact: true })).toBeVisible();
    await expect(
      crew.getByRole("button", { name: "Выйти из команды", exact: true }),
    ).toBeVisible();
    await crew.goto(managementPath);
    await expect(
      crew.getByRole("button", { name: "Закрыть команду", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      section.getByRole("button", { name: "Убрать из команды", exact: true }),
    ).toBeVisible();
    await crew.goto(publicPath!);
    await expect(
      crew.getByText(`Persistent crew ${suffix}`, { exact: true }),
    ).toBeVisible();
    expect(await crew.locator("main").innerText()).not.toMatch(/\bP\d+\b/);
    await crew.goto("/me");
    await crew.getByRole("button", { name: "Выйти из команды", exact: true }).click();
    await expect(crew.getByText(`Persistent ${suffix}`, { exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(
      section.getByRole("button", { name: "Убрать из команды", exact: true }),
    ).toHaveCount(0);
  } finally {
    await crewContext.close();
  }
});

test("players build a team, submit it and an organiser approves and adds an interested player", async ({
  page,
  context,
  browser,
  isMobile,
}, info) => {
  test.setTimeout(240_000);
  const number = isMobile ? 300 : 200;
  const suffix = isMobile ? "mobile" : "desktop";
  const name = `Orbit ${suffix}`;
  const captain = `Captain ${suffix}`;
  const opened: BrowserContext[] = [];
  try {
    await signup(page, captain, number, "/t/g4z-cup-13/register");
    await page.getByRole("link", { name: "Создать команду", exact: true }).click();
    await page.getByLabel("Название команды", { exact: true }).fill(name);
    await page.getByLabel("Тег", { exact: true }).fill(suffix.toUpperCase());
    await page.getByRole("button", { name: "Создать команду", exact: true }).click();
    await expect(page).toHaveURL(/\/me\/teams\/\d+$/);
    const teamPath = new URL(page.url()).pathname;
    await page.getByRole("button", { name: "Создать заявку", exact: true }).click();
    await expect(page).toHaveURL(/\/me\/applications\/\d+$/);
    const appPath = new URL(page.url()).pathname;
    const appId = appPath.split("/").at(-1)!;
    await page.getByRole("button", { name: "Подать заявку", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Нужно 5 основных");
    await page.getByRole("button", { name: "Занять слот самому" }).click();
    await expect(
      page
        .locator(".orbit-app-facts > div")
        .filter({ has: page.getByText("Основные", { exact: true }) })
        .locator("dd"),
    ).toHaveText(/1\s*\/\s*5/);
    await page.getByRole("button", { name: "Создать новую ссылку" }).click();
    const invite = await page
      .getByLabel("Ссылка-приглашение", { exact: true })
      .inputValue({ timeout: 15000 });
    expect(invite).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
    let firstCrew: Page | undefined;
    for (let i = 1; i <= 4; i++) {
      const crewContext = await browser.newContext();
      opened.push(crewContext);
      const crew = await crewContext.newPage();
      if (i === 1) firstCrew = crew;
      await asTelegram(crew, number + i);
      await crew.goto(invite);
      await crew.getByRole("link", { name: "Создать аккаунт и вернуться" }).click();
      await fillProfile(crew, `Crew ${suffix} ${i}`, number + i);
      await crew
        .getByRole("button", { name: "Создать аккаунт через Telegram" })
        .click();
      await expect(crew).toHaveURL(/\/invite\/[A-Za-z0-9_-]{43}$/);
      await crew
        .getByRole("button", { name: "Принять приглашение", exact: true })
        .click();
      await expect(crew).toHaveURL(new RegExp(`${appPath}$`));
      await expect(
        crew.getByRole("button", { name: "Создать новую ссылку" }),
      ).toHaveCount(0);
    }
    const interestedContext = await browser.newContext();
    opened.push(interestedContext);
    const interested = await interestedContext.newPage();
    await signup(
      interested,
      `Interest ${suffix}`,
      number + 5,
      "/t/g4z-cup-13/register",
    );
    await interested.getByRole("button", { name: "Ищу команду", exact: true }).click();
    await expect(
      interested.getByRole("button", { name: "Убрать отметку" }),
    ).toBeVisible();
    await interested.goto(appPath);
    await expect(
      interested.getByRole("heading", { name: "Мимо орбиты." }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page
        .locator(".orbit-app-facts > div")
        .filter({ has: page.getByText("Основные", { exact: true }) })
        .locator("dd"),
    ).toHaveText(/5\s*\/\s*5/);
    await page.getByLabel("Ник игрока", { exact: true }).fill(`Crew ${suffix}`);
    await page.getByRole("button", { name: "Найти игрока", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Пригласить", exact: true }).first(),
    ).toBeVisible();
    expect(await page.content()).not.toContain(`private_contact_${number + 1}`);
    expect(await page.content()).not.toContain(`private-player-${number + 1}`);
    await page.getByRole("button", { name: "Подать заявку", exact: true }).click();
    await expect(page.getByText("На проверке", { exact: true })).toBeVisible();
    const publicContext = await browser.newContext();
    opened.push(publicContext);
    const spectator = await publicContext.newPage();
    await spectator.goto("/t/g4z-cup-13/teams");
    expect(await spectator.content()).not.toContain(name);

    const orgContext = await browser.newContext();
    opened.push(orgContext);
    await admin(orgContext);
    const org = await orgContext.newPage();
    await org.goto("/admin/t/g4z-cup-13/registrations");
    await expect(
      org.getByRole("link", { name: new RegExp(`Interest ${suffix}`) }),
    ).toBeVisible();
    await org.goto(`/admin/t/g4z-cup-13/registrations/${appId}`);
    await org.getByLabel("Решение по заявке").selectOption("accepted");
    await org.getByLabel("Причина решения").fill("Состав проверен");
    await org.getByRole("button", { name: "Сохранить решение" }).click();
    await expect(org.getByText("Принята", { exact: true })).toBeVisible();
    await spectator.reload();
    await expect(spectator.getByRole("heading", { name, exact: true })).toBeVisible();
    const publicHtml = await spectator.content();
    expect(publicHtml).not.toContain(`private_contact_${number}`);
    expect(publicHtml).not.toContain(`private-player-${number}`);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Подать заявку", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Исключить", exact: true }),
    ).toHaveCount(0);

    await org.goto("/admin/t/g4z-cup-13/registrations");
    await org.getByRole("link", { name: new RegExp(`Interest ${suffix}`) }).click();
    await expect(
      org.getByRole("link", { name: `@private_contact_${number + 5}`, exact: true }),
    ).toBeVisible();
    await org
      .getByLabel("Командная заявка", { exact: true })
      .selectOption({ label: `G4Z CUP 13 · ${name}` });
    await org.getByLabel("Место в составе", { exact: true }).selectOption("substitute");
    await org
      .getByLabel("Причина изменения", { exact: true })
      .fill("Игрок без команды добавлен организатором");
    await org
      .getByRole("button", { name: "Добавить или переместить игрока", exact: true })
      .click();
    await expect(org.getByRole("status")).toContainText(
      "Изменения организатора сохранены",
    );
    await page.reload();
    await expect(page.getByText(`Interest ${suffix}`, { exact: true })).toBeVisible();
    await expect(
      page
        .locator(".orbit-app-facts > div")
        .filter({ has: page.getByText("Запасные", { exact: true }) })
        .locator("dd"),
    ).toHaveText(/1\s*\/\s*2/);
    await page.screenshot({
      path: info.outputPath("accepted-application.png"),
      fullPage: true,
    });

    await page.goto(teamPath);
    await page
      .getByLabel("Ник игрока", { exact: true })
      .last()
      .fill(`Crew ${suffix} 1`);
    await page
      .getByRole("button", { name: "Найти игрока", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Предложить роль", exact: true }).click();
    await firstCrew!.goto("/me");
    await firstCrew!.getByRole("button", { name: "Принять", exact: true }).click();
    await expect(firstCrew!).toHaveURL(new RegExp(`${teamPath}$`));
    await expect(
      firstCrew!.getByRole("button", { name: "Закрыть команду", exact: true }),
    ).toHaveCount(0);

    await page.goto("/me/profile");
    await page.getByLabel("Публичный ник", { exact: true }).fill(`${captain} updated`);
    await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Профиль сохранён");
    await spectator.reload();
    await spectator
      .getByRole("link")
      .filter({ has: spectator.getByRole("heading", { name, exact: true }) })
      .click();
    await expect(
      spectator.locator(".orbit-player").filter({ hasText: captain }),
    ).toBeVisible();
    expect(await spectator.content()).not.toContain(`${captain} updated`);
    await page.goto("/me");
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await page
      .getByRole("button", { name: "Войти через Telegram", exact: true })
      .click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(
      page.getByRole("heading", { name: `${captain} updated`, exact: true }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await context.cookies()).some((c) => c.name === SESSION_COOKIE)).toBe(
      false,
    );
  } finally {
    await Promise.allSettled(opened.map((c) => c.close()));
  }
});
