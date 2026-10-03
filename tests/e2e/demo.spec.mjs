import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("theme switcher keeps the article and color preference through navigation and reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".post-row")).toHaveCount(2);
  await page.getByRole("link", { name: /An intentionally long article/ }).click();
  await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
  await page.getByRole("button", { name: "Color theme: light. Change theme" }).click();
  for (const [name, id] of [
    ["Minimal", "minimal"],
    ["Paper", "paper"],
    ["Editorial", "editorial"],
  ]) {
    const link = page
      .getByRole("navigation", { name: "Design theme", exact: true })
      .getByRole("link", { name, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/blog\/note-02\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-design-theme", id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "An intentionally long article",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-design-theme", id);
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Design theme", exact: true })
      .getByRole("link", { name: "Editorial", exact: true }),
  ).toHaveAttribute("aria-current", "true");
});

test("all demo themes work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto("./");
    for (const [name, id] of [
      ["Minimal", "minimal"],
      ["Paper", "paper"],
      ["Editorial", "editorial"],
    ]) {
      await page
        .getByRole("navigation", { name: "Design theme", exact: true })
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-design-theme", id);
      await expect(page.locator(".post-row")).toHaveCount(2);
    }
    await page.getByRole("link", { name: /An intentionally long article/ }).click();
    await page
      .getByRole("navigation", { name: "Design theme", exact: true })
      .getByRole("link", { name: "Minimal", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Finish", exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("demo toolbar and pages are accessible in every theme and color mode", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  for (const name of ["Editorial", "Minimal", "Paper"]) {
    await page
      .getByRole("navigation", { name: "Design theme", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${colorScheme}.png`),
        fullPage: true,
      });
    }
  }
});
