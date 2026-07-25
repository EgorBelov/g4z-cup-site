import { defineConfig, devices } from "@playwright/test";

// Tests run against a local build by default so CI never touches production.
// Override with PLAYWRIGHT_BASE_URL to point at a preview deployment.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Lets a CI image or sandbox reuse a system Chromium instead of downloading
    // a second copy: CHROMIUM_PATH=/path/to/chrome npm run test:e2e
    launchOptions:
      process.env.CHROMIUM_PATH || process.env.CHROMIUM_ARGS
        ? {
            executablePath: process.env.CHROMIUM_PATH,
            args: process.env.CHROMIUM_ARGS?.split(" ").filter(Boolean),
          }
        : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      // Phone-sized Chromium rather than a WebKit device profile: the admin
      // panel is used on a phone, and this keeps CI to a single browser
      // download.
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: isExternalTarget
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
