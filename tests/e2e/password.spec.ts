import { expect, test } from "@playwright/test";
test.use({ actionTimeout: 15000 });

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "Writes use isolated fixtures only",
);

test("password players register, manage teams, edit nickname and log in again", async ({
  page,
  browser,
  isMobile,
}) => {
  test.setTimeout(120_000);
  const suffix = isMobile ? "mobile" : "desktop";
  const nickname = `Пароль ${suffix}`;
  const password = "a-test-password-2026";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#tournaments")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  if (isMobile) {
    for (const width of [320, 360, 430, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const position of [0, 0.5, 1]) {
        await page.evaluate(
          (fraction) =>
            window.scrollTo(
              0,
              (document.documentElement.scrollHeight - innerHeight) * fraction,
            ),
          position,
        );
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
          `home at ${width}px, scroll ${position}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  }
  await page.goto("/register?next=/me/teams/new");
  await page.getByRole("button", { name: "Ник и пароль", exact: true }).click();
  await page.getByLabel("Публичный ник", { exact: true }).fill(nickname);
  await page
    .getByLabel("Telegram для связи", { exact: true })
    .fill(`@password_${suffix}`);
  await page
    .getByLabel("Ссылка на Steam", { exact: true })
    .fill(`https://steamcommunity.com/id/password_${suffix}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("mismatched-password");
  await page
    .getByRole("button", { name: "Создать аккаунт по паролю", exact: true })
    .click();
  await expect(page.getByText("Пароли не совпадают", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Публичный ник", { exact: true })).toHaveValue(nickname);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByLabel("Повторите пароль", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Создать аккаунт по паролю", exact: true })
    .click();
  await expect(page).toHaveURL(/\/me\/teams\/new$/);
  await page
    .getByLabel("Название команды", { exact: true })
    .fill(`Password team ${suffix}`);
  await page.getByRole("button", { name: "Создать команду", exact: true }).click();
  await expect(page).toHaveURL(/\/me\/teams\/\d+$/);
  await page.goto("/me/profile");
  await expect(
    page.getByText(`Логин: ${nickname.toLowerCase()}. Telegram указан для связи`),
  ).toBeVisible();
  await page.getByLabel("Публичный ник", { exact: true }).fill(`Changed ${suffix}`);
  await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Профиль сохранён");
  await page.goto("/me");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Ник и пароль", exact: true }).click();
  await page
    .getByLabel("Ник при регистрации", { exact: true })
    .fill(nickname.toUpperCase());
  await page.getByLabel("Пароль", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Войти по паролю", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Неверный ник или пароль");
  await expect(page.getByLabel("Ник при регистрации", { exact: true })).toHaveValue(
    nickname.toUpperCase(),
  );
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти по паролю", exact: true }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(
    page.getByRole("heading", { name: `Changed ${suffix}`, exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  const other = await browser.newContext();
  try {
    const duplicate = await other.newPage();
    await duplicate.goto("/register");
    await duplicate.getByRole("button", { name: "Ник и пароль", exact: true }).click();
    await duplicate
      .getByLabel("Публичный ник", { exact: true })
      .fill(nickname.toUpperCase());
    await duplicate
      .getByLabel("Telegram для связи", { exact: true })
      .fill("@someone_else");
    await duplicate
      .getByLabel("Ссылка на Steam", { exact: true })
      .fill("https://steamcommunity.com/id/someone_else");
    await duplicate.getByLabel("Пароль", { exact: true }).fill(password);
    await duplicate.getByLabel("Повторите пароль", { exact: true }).fill(password);
    await duplicate
      .getByRole("button", { name: "Создать аккаунт по паролю", exact: true })
      .click();
    await expect(duplicate.getByRole("status")).toContainText("Этот ник уже занят");
  } finally {
    await other.close();
  }
  expect(errors).toEqual([]);
});
