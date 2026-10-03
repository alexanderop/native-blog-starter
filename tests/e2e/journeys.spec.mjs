import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const article = "blog/note-23/";
test("keyboard Finder opens, navigates to headings, restores focus, and retries", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Finder" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Finder" })).toBeFocused();
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("/");
  await page.getByRole("combobox").fill("The next step");
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/note-23\/#the-next-step$/);
  await expect(page.getByRole("heading", { name: "The next step" })).toBeInViewport();
  await page.reload();
  await page.route("**/search.json", (route) => route.abort());
  await page.keyboard.press("/");
  await expect(page.getByRole("button", { name: "Retry search" })).toBeVisible();
  await page.unroute("**/search.json");
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main")).toBeFocused();
});
test("theme survives another page and reload; contents, code and downloads work", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
  await page.getByRole("button", { name: "Color theme: light. Change theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: /An intentionally long article/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Color theme: dark. Change theme" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Table of contents" })
    .getByRole("link", { name: "The next step" })
    .click();
  await expect(page).toHaveURL(/#the-next-step$/);
  await expect(page.getByRole("heading", { name: "The next step" })).toBeInViewport();
  const href = await page.getByRole("link", { name: "Download Markdown" }).getAttribute("href");
  const response = await page.request.get(href);
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("title: An intentionally long");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(await page.locator("pre").evaluate((el) => el.scrollWidth > el.clientWidth)).toBeTruthy();
});
test("archives and complete articles work without JavaScript in system dark mode", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Finder" })).toBeHidden();
  expect(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    "rgb(20, 20, 19)",
  );
  await page.getByRole("link", { name: "Explore the archive" }).click();
  await page.getByRole("link", { name: "Older notes" }).click();
  await page.getByRole("link", { name: "Older notes" }).click();
  await expect(page.locator(".post-row")).toHaveCount(3);
  await page.goto(article);
  await expect(page.getByRole("heading", { name: "Finish", exact: true })).toBeVisible();
  await context.close();
});
test("blocked storage falls back without browser errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Storage blocked");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(article);
  await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
test("accessible home, article and Finder in both themes, without page overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme });
    for (const route of ["./", article]) {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    await page.keyboard.press("/");
    await expect(page.getByRole("option").first()).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
  }
  expect(errors).toEqual([]);
});
