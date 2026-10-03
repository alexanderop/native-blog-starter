import { test, expect } from "@playwright/test";
for (const [size, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
])
  for (const theme of ["light", "dark"])
    test(`${size} ${theme} reading and Finder`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      for (const [name, path] of [
        ["home", "./"],
        ["article", "blog/note-23/"],
      ]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${size}-${theme}-${name}.png`, { fullPage: true });
      }
      await page.keyboard.press("/");
      await page.getByRole("combobox").fill("next step");
      await expect(page.getByRole("option")).toHaveCount(2);
      await expect(page).toHaveScreenshot(`${size}-${theme}-finder.png`);
    });
