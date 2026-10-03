import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: "**/visual.spec.mjs",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "node tests/fixtures/server.mjs",
    url: "http://127.0.0.1:5272/people/alex/",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:5271" } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        baseURL: "http://127.0.0.1:5271",
      },
    },
    {
      name: "nested",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:5272/people/alex/" },
    },
  ],
});
