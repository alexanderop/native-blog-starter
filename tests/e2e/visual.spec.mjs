import { test, expect } from "@playwright/test";
for (const [design, port] of [
  ["editorial", 5271],
  ["minimal", 5273],
  ["paper", 5275],
])
  for (const [size, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ])
    for (const theme of ["light", "dark"])
      test(`${design} ${size} ${theme} reading and Finder`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        for (const [name, path] of [
          ["home", "./"],
          ["article", "blog/note-23/"],
        ]) {
          await page.goto(`http://127.0.0.1:${port}/${path === "./" ? "" : path}`);
          await page.evaluate(() => document.fonts.ready);
          await expect(page).toHaveScreenshot(
            `${design === "editorial" ? "" : `${design}-`}${size}-${theme}-${name}.png`,
            { fullPage: true },
          );
        }
        await page.keyboard.press("/");
        await page.getByRole("combobox").fill("next step");
        await expect(page.getByRole("option")).toHaveCount(2);
        await expect(page).toHaveScreenshot(
          `${design === "editorial" ? "" : `${design}-`}${size}-${theme}-finder.png`,
        );
      });
