import { defineConfig, devices } from "@playwright/test";
import { fixtureEnvironment } from "./tests/fixtures/environment";

// Local runs build the application with isolated data and test credentials.
// An explicit preview URL runs only the read-only smoke/access checks.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: isExternalTarget ? "**/tournament.spec.ts" : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
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
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      // Phone-sized Chromium rather than a WebKit device profile: the admin
      // panel is used on a phone, and this keeps CI to a single browser
      // download.
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: isExternalTarget
    ? undefined
    : [
        {
          command: "node tests/fixtures/server.mjs",
          url: "http://127.0.0.1:54329/health",
          reuseExistingServer: false,
        },
        {
          command: "npm run build && npm run start -- --hostname 127.0.0.1",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 180_000,
          env: fixtureEnvironment,
        },
      ],
});
