import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/visual.spec.mjs",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}-{platform}{ext}",
  use: { baseURL: "http://127.0.0.1:5271", ...devices["Desktop Chrome"] },
  webServer: {
    command: "node tests/fixtures/server.mjs",
    url: "http://127.0.0.1:5276/people/alex/",
    reuseExistingServer: false,
  },
  workers: 1,
});
