import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("native navigation, Finder, color persistence and an actual Markdown download", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Color theme: system. Change theme" }).click();
  await page.getByRole("button", { name: "Color theme: light. Change theme" }).click();
  await page.getByRole("link", { name: "About", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Color theme: dark. Change theme" })).toBeVisible();
  await page.getByRole("button", { name: "Finder" }).click();
  await page.getByRole("combobox").fill("The next step");
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "The next step" })).toBeInViewport();
  await expect(page.getByRole("img", { name: "Fixture diagram" })).toHaveAttribute("width", "960");
  await expect(page.locator("pre code")).toHaveText(
    `const deliberatelyLongLine = '${"x".repeat(230)}';`,
  );
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Markdown" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("note-23.md");
  expect(await readFile(await download.path(), "utf8")).toContain("draft: false");
  expect(errors).toEqual([]);
});

test("article and highlighted code remain readable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("./");
    await page.getByRole("link", { name: /An intentionally long article/ }).click();
    await expect(page.getByRole("heading", { name: "Finish", exact: true })).toBeVisible();
    await expect(page.locator("pre code .hljs-keyword")).toHaveText("const");
    await expect(page.getByRole("button", { name: "Finder" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Download Markdown" })).toBeVisible();
  } finally {
    await context.close();
  }
});
