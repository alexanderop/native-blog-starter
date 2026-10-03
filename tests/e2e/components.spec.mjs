import { test, expect } from "@playwright/test";

const article = "blog/note-23/";

test("generated light DOM remains usable when enhancement scripts fail", async ({ page }) => {
  await page.route("**/assets/app.js", (route) => route.abort());
  await page.goto(article);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download Markdown" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy URL" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Finder" })).toBeHidden();
  expect(await page.locator("copy-actions").evaluate((el) => el.shadowRoot)).toBeNull();
  expect(await page.evaluate(() => customElements.get("copy-actions") === undefined)).toBe(true);
  await page
    .getByRole("navigation", { name: "Table of contents" })
    .getByRole("link", { name: "Finish", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Finish", exact: true })).toBeInViewport();
});

test("copy instances keep their own status and reconnect without duplicate writes", async ({
  page,
}) => {
  const writes = [];
  await page.exposeFunction("recordCopy", (text) => {
    writes.push(text);
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: (text) => window.recordCopy(text) },
    });
  });
  await page.goto(article);
  await expect(page.getByRole("button", { name: "Copy URL" })).toBeVisible();
  await page.locator("copy-actions").evaluate((el) => {
    const clone = el.cloneNode(true);
    el.after(clone);
    clone.remove();
    el.after(clone);
  });
  const first = page.locator("copy-actions").nth(0),
    second = page.locator("copy-actions").nth(1);
  await second.getByRole("button", { name: "Copy URL" }).click();
  await expect(second.getByRole("status")).toHaveText("Copied to clipboard.");
  await expect(first.getByRole("status")).toBeEmpty();
  expect(writes).toEqual([page.url()]);
  await first.getByRole("button", { name: "Copy Markdown" }).click();
  await expect(first.getByRole("status")).toHaveText("Copied to clipboard.");
  expect(writes).toHaveLength(2);
  expect(writes[1]).toContain("draft: false");
  expect(writes[1]).toContain("## The next step");
  await page.route("**/markdown/*.md", (route) => route.abort());
  await second.getByRole("button", { name: "Copy Markdown" }).click();
  await expect(second.getByRole("status")).toContainText("Could not copy");
  await expect(first.getByRole("status")).toHaveText("Copied to clipboard.");
  await expect(second.getByRole("link", { name: "Download Markdown" })).toBeVisible();
  expect(writes).toHaveLength(2);
});

test("Finder aborts detached requests and reconnects with one working shortcut", async ({
  page,
}) => {
  const aborted = [];
  await page.exposeFunction("recordAbort", (url) => {
    aborted.push(url);
  });
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, options) => {
      options?.signal?.addEventListener(
        "abort",
        () => {
          void window.recordAbort(String(input));
        },
        { once: true },
      );
      return original(input, options);
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let started;
  const requested = new Promise((resolve) => {
    started = resolve;
  });
  await page.route("**/search.json", async (route) => {
    started();
    await gate;
    await route.abort().catch(() => {});
  });
  await page.getByRole("button", { name: "Finder" }).click();
  await requested;
  const finder = await page.locator("site-finder").elementHandle();
  await finder.evaluate((el) => el.remove());
  await expect.poll(() => aborted.length).toBe(1);
  await expect(page.getByRole("button", { name: "Finder" })).toBeHidden();
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  await page.unrouteAll({ behavior: "wait" });
  await page.evaluate((el) => document.body.append(el), finder);
  await expect(page.getByRole("button", { name: "Finder" })).toBeVisible();
  await page.keyboard.press("/");
  await page.getByRole("combobox").fill("The next step");
  await expect(page.getByRole("option")).toHaveCount(2);
  const first = await page.getByRole("combobox").getAttribute("aria-activedescendant");
  await page.keyboard.press("ArrowDown");
  const second = await page.getByRole("combobox").getAttribute("aria-activedescendant");
  expect(second).not.toBe(first);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main")).toBeFocused();
  expect(errors).toEqual([]);
});

test("invalid search data offers retry without creating unsafe options", async ({ page }) => {
  await page.route("**/search.json", (route) =>
    route.fulfill({
      json: [
        {
          title: "Unsafe",
          description: "x",
          content: "x",
          url: "javascript:alert(1)",
          category: "x",
          tags: [],
        },
      ],
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Finder" }).click();
  await expect(page.getByRole("button", { name: "Retry search" })).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.unrouteAll();
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
});
