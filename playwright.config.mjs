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
    url: "http://127.0.0.1:5277/native-blog-starter/",
    reuseExistingServer: false,
  },
  projects: [
    ["editorial", 5271],
    ["minimal", 5273],
    ["paper", 5275],
  ]
    .flatMap(([theme, port]) => [
      {
        name: `${theme}-desktop`,
        testMatch: "**/journeys.spec.mjs",
        use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` },
      },
      {
        name: `${theme}-mobile`,
        testMatch: "**/journeys.spec.mjs",
        use: {
          ...devices["iPhone 13"],
          defaultBrowserType: "chromium",
          baseURL: `http://127.0.0.1:${port}`,
        },
      },
      {
        name: `${theme}-nested`,
        testMatch: "**/journeys.spec.mjs",
        use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port + 1}/people/alex/` },
      },
    ])
    .concat([
      {
        name: "chromium-components",
        testMatch: "**/components.spec.mjs",
        use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:5272/people/alex/" },
      },
      {
        name: "firefox-smoke",
        testMatch: ["**/smoke.spec.mjs", "**/components.spec.mjs"],
        use: { ...devices["Desktop Firefox"], baseURL: "http://127.0.0.1:5272/people/alex/" },
      },
      {
        name: "webkit-smoke",
        testMatch: ["**/smoke.spec.mjs", "**/components.spec.mjs"],
        use: { ...devices["Desktop Safari"], baseURL: "http://127.0.0.1:5271/" },
      },
      {
        name: "webkit-mobile-smoke",
        testMatch: ["**/smoke.spec.mjs", "**/components.spec.mjs"],
        use: { ...devices["iPhone 13"], baseURL: "http://127.0.0.1:5272/people/alex/" },
      },
      {
        name: "demo-desktop",
        testMatch: "**/demo.spec.mjs",
        use: {
          ...devices["Desktop Chrome"],
          baseURL: "http://127.0.0.1:5277/native-blog-starter/",
        },
      },
      {
        name: "demo-mobile",
        testMatch: "**/demo.spec.mjs",
        use: {
          ...devices["iPhone 13"],
          defaultBrowserType: "chromium",
          baseURL: "http://127.0.0.1:5277/native-blog-starter/",
        },
      },
    ]),
});
