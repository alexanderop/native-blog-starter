import { test, expect } from "@playwright/test";
import { parseContent } from "../../src/core/content.ts";
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
  const downloaded = parseContent(await response.text(), "download.md", "Default author");
  expect(downloaded.title).toBe(await page.getByRole("heading", { level: 1 }).textContent());
  expect(downloaded.body).toContain("## The next step");
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
  const darkBackground = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el).colorScheme)).toBe(
    "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  expect(
    await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(darkBackground);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("link", { name: "Explore the archive" }).click();
  await page.getByRole("link", { name: "Older notes" }).click();
  await page.getByRole("link", { name: "Older notes" }).click();
  await expect(page.locator(".post-row")).toHaveCount(3);
  await page.goto(article);
  await expect(page.getByRole("heading", { name: "Finish", exact: true })).toBeVisible();
  await expect(page.locator("pre .syntax-keyword").first()).toBeVisible();
  const darkKeyword = await page
    .locator("pre .syntax-keyword")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  await page.emulateMedia({ colorScheme: "light" });
  expect(
    await page
      .locator("pre .syntax-keyword")
      .first()
      .evaluate((el) => getComputedStyle(el).color),
  ).not.toBe(darkKeyword);
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

test("selected design uses local CSS, preserves color choice and has no external requests", async ({
  page,
  baseURL,
}, testInfo) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  const theme = testInfo.project.name.split("-")[0];
  await expect(page.locator("html")).toHaveAttribute("data-design-theme", theme);
  const cssLink = page.locator('link[rel="stylesheet"]').last();
  const href = await cssLink.getAttribute("href");
  expect(href).toBe(
    new URL("assets/theme.css", baseURL.endsWith("/") ? baseURL : baseURL + "/").pathname,
  );
  const css = await page.request.get(href);
  expect(css.ok()).toBeTruthy();
  expect(css.headers()["content-type"]).toContain("text/css");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(requests.every((url) => new URL(url).origin === new URL(baseURL).origin)).toBeTruthy();
});

test("highlighted code preserves text and readable semantic colors in explicit and system modes", async ({
  page,
  baseURL,
}, testInfo) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(article);
  const code = page.locator("pre code");
  expect(await code.textContent()).toBe(`/* A multiline comment.
   Keep its state across lines. */
type Count = number;
function greet(name: string): string { return name; }
const count: Count = 42;
const deliberatelyLongLine = '${"x".repeat(230)}';`);
  const palettes = {};
  for (const mode of ["system-light", "system-dark", "light", "dark"]) {
    await page.emulateMedia({ colorScheme: mode.endsWith("dark") ? "dark" : "light" });
    if (mode === "light")
      await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
    if (mode === "dark")
      await page.getByRole("button", { name: "Color theme: light. Change theme" }).click();
    palettes[mode] = await page.locator("pre").evaluate((pre) => {
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const background = luminance(getComputedStyle(pre).backgroundColor);
      return Object.fromEntries(
        [...pre.querySelectorAll("span")].map((span) => {
          const color = getComputedStyle(span).color;
          const foreground = luminance(color);
          return [
            span.className,
            {
              color,
              contrast:
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05),
            },
          ];
        }),
      );
    });
    for (const role of [
      "comment",
      "keyword",
      "string",
      "number",
      "function",
      "type",
      "variable",
      "punctuation",
    ]) {
      expect(palettes[mode][`syntax-${role}`], `${mode} ${role}`).toBeDefined();
      expect(
        palettes[mode][`syntax-${role}`].contrast,
        `${mode} ${role} contrast`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    await page.locator("pre").screenshot({ path: testInfo.outputPath(`syntax-${mode}.png`) });
  }
  expect(palettes["system-light"]).toEqual(palettes.light);
  expect(palettes["system-dark"]).toEqual(palettes.dark);
  expect(palettes.light["syntax-keyword"].color).not.toBe(palettes.dark["syntax-keyword"].color);
  expect(palettes.light["syntax-keyword"].color).not.toBe(palettes.light["syntax-string"].color);
  expect(requests.every((url) => new URL(url).origin === new URL(baseURL).origin)).toBe(true);
  expect(requests.some((url) => /shiki|\.wasm/.test(url))).toBe(false);
  await page.route("**/assets/tokens.css", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/^.*--syntax-.*$/gm, "");
    await route.fulfill({ response, body });
  });
  await page.reload();
  const fallback = await code.evaluate((element) => ({
    plain: getComputedStyle(element).color,
    keyword: getComputedStyle(element.querySelector(".syntax-keyword")).color,
  }));
  expect(fallback.keyword).toBe(fallback.plain);
  expect(fallback.plain).not.toBe("");
});
